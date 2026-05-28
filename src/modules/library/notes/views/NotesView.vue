<script setup lang="ts">
defineOptions({ name: 'LibraryNotesView' })

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ModulePageLayout from '@app/components/ModulePageLayout.vue'
import PageHeader from '@app/components/PageHeader.vue'
import EmptyState from '@app/components/EmptyState.vue'
import WwButton from '@shared/components/WwButton.vue'
import { useNotesStore } from '@shared/stores/notes'
import type { NoteColor } from '@shared/types/notes'
import { useWanwuConfirm } from '@shared/composables/useWanwuConfirm'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import NotesSidebar from '@modules/library/notes/components/NotesSidebar.vue'
import NotesEditor from '@modules/library/notes/components/NotesEditor.vue'
import { useNotesDraft } from '@modules/library/notes/lib/useNotesDraft'
import { normalizeNotePlainText } from '@modules/library/notes/lib/noteContentText'
import { collectNoteImageIdsFromHtml } from '@modules/library/notes/lib/noteImageContent'
import type { NoteItem } from '@shared/types/notes'

const NOTE_COLORS: NoteColor[] = [
  'yellow',
  'green',
  'blue',
  'pink',
  'purple',
  'orange',
  'teal',
  'red',
  'gray'
]
const COLOR_LABELS: Record<NoteColor, string> = {
  yellow: '黄色',
  green: '绿色',
  blue: '蓝色',
  pink: '粉色',
  purple: '紫色',
  gray: '灰色',
  orange: '橙色',
  teal: '青色',
  red: '红色'
}

const notesStore = useNotesStore()
const toast = useWanwuToast()
const confirm = useWanwuConfirm()

const searchQuery = ref('')
const draftTitle = ref('')
const draftContent = ref('')
const notesEditorRef = ref<InstanceType<typeof NotesEditor> | null>(null)
const selected = computed(() => notesStore.selectedNote)
const headerSubtitle = computed(() => {
  const total = notesStore.notes.length
  if (notesStore.loading) return '正在加载便笺...'
  if (total === 0) return '轻量记录，自动保存'
  const pinnedCount = notesStore.notes.filter((item) => item.pinned).length
  return `共 ${total} 条${pinnedCount > 0 ? `，置顶 ${pinnedCount} 条` : ''}`
})

const IMAGE_PRUNE_GRACE_MS = 3000

async function pruneUnreferencedNoteImages(noteId: string, contentHtml: string) {
  const referenced = collectNoteImageIdsFromHtml(contentHtml)
  const note = notesStore.notes.find((item) => item.id === noteId)
  if (!note) return
  const now = Date.now()
  for (const image of [...note.images]) {
    if (referenced.has(image.id)) continue
    const age = now - new Date(image.createdAt).getTime()
    if (!Number.isFinite(age) || age < IMAGE_PRUNE_GRACE_MS) continue
    await notesStore.removeImage(image.id)
  }
}

const {
  saveUiState,
  saveUiLabel,
  saveUiVisible,
  saveUiCancellable,
  cancelSave,
  flushDraft
} = useNotesDraft({
  selected,
  draftTitle,
  draftContent,
  beforePersist: () => {
    notesEditorRef.value?.syncToDraft()
  },
  persist: async (noteId, title, content) => {
    await notesStore.updateNote(noteId, { title, content })
  },
  onPersistError: () => {
    toast.error('便笺保存失败，请稍后重试')
  }
})

onMounted(async () => {
  try {
    await notesStore.loadAll()
    if (!notesStore.selectedNoteId && notesStore.notes.length > 0) {
      notesStore.setSelected(notesStore.notes[0].id)
    }
  } catch {
    toast.error('加载便笺失败')
  }
})

onBeforeUnmount(async () => {
  const noteId = notesStore.selectedNoteId
  const content = draftContent.value
  await flushDraft()
  if (noteId) {
    await pruneUnreferencedNoteImages(noteId, content)
  }
})

watch(
  () => [notesStore.loading, notesStore.notes.length, notesStore.selectedNoteId, selected.value?.id] as const,
  ([loading, size, selectedId, selectedResolvedId]) => {
    if (loading) return
    if (size <= 0) return
    if (selectedId && selectedResolvedId) return
    notesStore.setSelected(notesStore.notes[0]?.id ?? null)
  },
  { immediate: true }
)

async function createNote() {
  try {
    await notesStore.createNote()
  } catch {
    toast.error('创建便笺失败')
  }
}

async function selectNote(id: string) {
  if (notesStore.selectedNoteId === id) return
  const leavingId = notesStore.selectedNoteId
  const leavingContent = draftContent.value
  await flushDraft()
  if (leavingId) {
    await pruneUnreferencedNoteImages(leavingId, leavingContent)
  }
  notesStore.setSelected(id)
}

async function togglePinned() {
  const note = selected.value
  if (!note) return
  try {
    await notesStore.updateNote(note.id, { pinned: !note.pinned })
  } catch {
    toast.error('更新置顶状态失败')
  }
}

async function setColor(color: NoteColor) {
  const note = selected.value
  if (!note || note.color === color) return
  try {
    await notesStore.updateNote(note.id, { color })
  } catch {
    toast.error('更新颜色失败')
  }
}

async function removeCurrent() {
  const note = selected.value
  if (!note) return
  const ok = await confirm.ask({
    header: '删除便笺',
    message: '删除后无法恢复，确定删除这张便笺吗？',
    acceptLabel: '删除',
    danger: true
  })
  if (!ok) return
  try {
    await notesStore.deleteNote(note.id)
  } catch {
    toast.error('删除便笺失败')
  }
}

async function removeById(noteId: string) {
  const note = notesStore.notes.find((item) => item.id === noteId)
  if (!note) return
  const ok = await confirm.ask({
    header: '删除便笺',
    message: `确定删除「${note.title || '未命名便笺'}」吗？删除后无法恢复。`,
    acceptLabel: '删除',
    danger: true
  })
  if (!ok) return
  try {
    await notesStore.deleteNote(noteId)
  } catch {
    toast.error('删除便笺失败')
  }
}

async function pickImage() {
  const note = selected.value
  if (!note) return
  const picked = await window.wanwu.shell.pickImageFile()
  if (!picked.ok || !picked.path) return
  try {
    await notesStore.addImage(note.id, picked.path)
  } catch {
    toast.error('添加图片失败')
  }
}

async function insertImageByPath(filePath: string) {
  const note = selected.value
  if (!note || !filePath) return
  try {
    await notesStore.addImage(note.id, filePath)
  } catch {
    toast.error('插入图片失败')
  }
}

function getNoteTitle(note: NoteItem) {
  return note.title.trim() || '未命名便笺'
}

async function copyNote(noteId: string) {
  const note = notesStore.notes.find((item) => item.id === noteId)
  if (!note) return
  const text = `${getNoteTitle(note)}\n\n${normalizeNotePlainText(note.content || '')}`.trim()
  try {
    await window.wanwu.shell.copyText(text)
    toast.success('已复制便笺内容')
  } catch {
    toast.error('复制失败')
  }
}

async function onSidebarAction(payload: {
  action: 'toggle-pinned' | 'delete' | 'copy'
  noteId: string
}) {
  if (payload.action === 'delete') {
    await removeById(payload.noteId)
    return
  }
  if (payload.action === 'copy') {
    await copyNote(payload.noteId)
    return
  }
  if (payload.action === 'toggle-pinned') {
    const note = notesStore.notes.find((item) => item.id === payload.noteId)
    if (!note) return
    await notesStore.updateNote(note.id, { pinned: !note.pinned })
    return
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden">
    <ModulePageLayout class="ww-notes-layout min-h-0 flex-1">
      <template #header>
        <PageHeader title="便笺" :subtitle="headerSubtitle" stacked-titles>
          <template #actions>
            <span
              v-if="saveUiVisible"
              class="ww-notes-save-hint"
              :class="`is-${saveUiState}`"
              role="status"
              aria-live="polite"
            >
              <span
                v-if="saveUiState === 'saving'"
                class="ww-notes-save-hint__dot"
                aria-hidden="true"
              />
              <span class="ww-notes-save-hint__text">{{ saveUiLabel }}</span>
              <button
                v-if="saveUiCancellable"
                type="button"
                class="ww-notes-save-hint__cancel"
                aria-label="取消保存"
                @click="cancelSave"
              >
                ×
              </button>
            </span>
            <WwButton icon="plus" size="small" label="新建" class="ww-notes-create-btn" @click="createNote" />
          </template>
        </PageHeader>
      </template>

      <div class="ww-notes-workspace">
        <NotesSidebar
          v-model:searchQuery="searchQuery"
          :notes="notesStore.notes"
          :selected-note-id="notesStore.selectedNoteId"
          :loading="notesStore.loading"
          @select="selectNote"
          @action="onSidebarAction"
        />

        <NotesEditor
          v-if="selected"
          ref="notesEditorRef"
          v-model:draftTitle="draftTitle"
          v-model:draftContent="draftContent"
          :note="selected"
          :note-colors="NOTE_COLORS"
          :color-labels="COLOR_LABELS"
          @flush="flushDraft"
          @toggle-pinned="togglePinned"
          @set-color="setColor"
          @pick-image="pickImage"
          @insert-image-by-path="insertImageByPath"
          @remove-note="removeCurrent"
        />

        <EmptyState
          v-else-if="!notesStore.loading"
          class="ww-notes-empty"
          variant="empty"
          title="还没有便笺"
          description="点击右上角「新建」，或先在左侧创建你的第一张便笺。"
        >
          <WwButton icon="plus" size="small" label="新建便笺" @click="createNote" />
        </EmptyState>
      </div>
    </ModulePageLayout>
  </div>
</template>

<style scoped>
.ww-notes-layout :deep(.ww-module-layout__body > .ww-notes-workspace) {
  padding: var(--ww-page-padding);
  flex: 1;
  min-height: 0;
}

.ww-notes-workspace {
  --ww-notes-gap: 0.875rem;
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: var(--ww-notes-gap);
  align-items: stretch;
}

.ww-notes-workspace > * {
  min-width: 0;
}

.ww-notes-save-hint {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  margin-right: 0.5rem;
  font-size: 0.75rem;
  color: var(--ww-ink-faint);
  padding: 0.125rem 0.375rem;
  border-radius: 0.375rem;
}

.ww-notes-save-hint.is-timeout {
  color: var(--ww-ink-muted);
}

.ww-notes-save-hint.is-error {
  color: var(--ww-danger, #d84f4a);
}

.ww-notes-save-hint__text {
  white-space: nowrap;
}

.ww-notes-save-hint__cancel {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.125rem;
  height: 1.125rem;
  padding: 0;
  margin-left: 0.125rem;
  border: none;
  border-radius: 999px;
  background: color-mix(in oklab, var(--ww-ink-muted) 22%, transparent);
  color: var(--ww-ink);
  font-size: 0.875rem;
  line-height: 1;
  cursor: pointer;
}

.ww-notes-save-hint__cancel:hover {
  background: color-mix(in oklab, var(--ww-ink-muted) 35%, transparent);
}

.ww-notes-save-hint__dot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 50%;
  background: var(--ww-ink-faint);
  animation: ww-notes-pulse 1.2s ease-in-out infinite;
}

.ww-notes-layout :deep(.ww-notes-create-btn.p-button) {
  min-height: 1.8rem;
  padding-block: 0.2rem;
}

@keyframes ww-notes-pulse {
  0%,
  100% {
    opacity: 0.35;
  }
  50% {
    opacity: 1;
  }
}

.ww-notes-empty {
  grid-column: 1 / -1;
}

@media (max-width: 960px) {
  .ww-notes-workspace {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(11rem, 14rem) minmax(0, 1fr);
    gap: 0.625rem;
  }
}
</style>
