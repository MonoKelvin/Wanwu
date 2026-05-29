<script setup lang="ts">
defineOptions({ name: 'LibraryNotesView' })

import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import ModulePageLayout from '@app/components/ModulePageLayout.vue'
import PageHeader from '@app/components/PageHeader.vue'
import EmptyState from '@app/components/EmptyState.vue'
import WwButton from '@shared/components/WwButton.vue'
import { useNotePopout, type PopoutScreenAnchor } from '@modules/library/notes/lib/useNotePopout'
import { useNotePopoutsBatch } from '@modules/library/notes/lib/useNotePopoutsBatch'
import { useNotePopoutAutoRestoreOnEnter } from '@modules/library/notes/lib/useNotePopoutAutoRestore'
import { useNotesBrowse } from '@modules/library/notes/lib/useNotesBrowse'
import { NOTE_COLORS, NOTE_COLOR_LABELS } from '@shared/constants/noteColors'
import { pruneUnreferencedNoteImages } from '@modules/library/notes/app/pruneNoteImages'
import { useNotesStore } from '@shared/stores/notes'
import type { NoteColor } from '@shared/types/notes'
import { useWanwuConfirm } from '@shared/composables/useWanwuConfirm'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import NotesSidebar from '@modules/library/notes/components/NotesSidebar.vue'
import NotesEditor from '@modules/library/notes/components/NotesEditor.vue'
import { useNotesDraft } from '@modules/library/notes/lib/useNotesDraft'
import { registerNotePopoutSelectHandler } from '@modules/library/notes/lib/notePopoutFocusSync'
import { normalizeNotePlainText } from '@modules/library/notes/lib/noteContentText'
import type { NoteItem } from '@shared/types/notes'

const notesStore = useNotesStore()
const toast = useWanwuToast()
const confirm = useWanwuConfirm()

const browse = useNotesBrowse()
const {
  searchQuery,
  notes,
  selectedNoteId,
  sidebarSelectedId,
  loading,
  listNotes,
  isSearchActive,
  isSearchNoMatch,
  showRightPane,
  showPickHint,
  pickedInSearch,
  markPickedInSearch,
  loadNotes
} = browse

const draftTitle = ref('')
const draftContent = ref('')
const notesEditorRef = ref<InstanceType<typeof NotesEditor> | null>(null)

/** 用 id + 列表解析，避免 store 数组更新瞬间 selectedNote 为 null 导致草稿被清空 */
const editorNote = computed(() => {
  const id = selectedNoteId.value
  if (!id) return null
  return notes.value.find((n) => n.id === id) ?? null
})

const { isPopoutOpen, popoutToggleLabel, togglePopout } = useNotePopout(selectedNoteId)
const { scopeCount, batchLabel, toggleAllPopouts } = useNotePopoutsBatch()

useNotePopoutAutoRestoreOnEnter()

const headerSubtitle = computed(() => {
  const total = notes.value.length
  if (loading.value) return '正在加载便笺...'
  if (total === 0) return '轻量记录，自动保存'
  const pinnedCount = notes.value.filter((item) => item.pinned).length
  return `共 ${total} 条${pinnedCount > 0 ? `，置顶 ${pinnedCount} 条` : ''}`
})

const {
  saveUiState,
  saveUiLabel,
  saveUiVisible,
  saveUiCancellable,
  cancelSave,
  flushDraft
} = useNotesDraft({
  selected: editorNote,
  draftTitle,
  draftContent,
  beforePersist: () => {
    notesEditorRef.value?.syncToDraft()
  },
  persist: async (noteId, title, content, options) => {
    await notesStore.updateNote(noteId, { title, content, touchUpdatedAt: options?.touchUpdatedAt })
  },
  onPersistError: () => {
    toast.error('便笺保存失败，请稍后重试')
  }
})

onMounted(async () => {
  try {
    await loadNotes()
  } catch {
    toast.error('加载便笺失败')
  }
})

async function selectNote(id: string) {
  if (selectedNoteId.value === id && (!isSearchActive.value || pickedInSearch.value)) {
    return
  }

  notesEditorRef.value?.syncToDraft()
  const leavingId = selectedNoteId.value

  if (leavingId && leavingId !== id) {
    const leavingContent = draftContent.value
    const leavingNote = notesStore.notes.find((item) => item.id === leavingId)
    await flushDraft({ touchUpdatedAt: false })
    if (leavingNote) {
      await pruneUnreferencedNoteImages(leavingNote.images, leavingContent, (imageId) =>
        notesStore.removeImage(imageId)
      )
    }
  }

  markPickedInSearch()
  notesStore.setSelected(id)

  await nextTick()
  notesEditorRef.value?.hydrateFromDraft?.()
}

const unregisterPopoutSelectHandler = registerNotePopoutSelectHandler((id) => selectNote(id))

onBeforeUnmount(async () => {
  unregisterPopoutSelectHandler()
  const noteId = notesStore.selectedNoteId
  const content = draftContent.value
  const note = noteId ? notesStore.notes.find((item) => item.id === noteId) : null
  await flushDraft()
  if (note) {
    await pruneUnreferencedNoteImages(note.images, content, (imageId) =>
      notesStore.removeImage(imageId)
    )
  }
})

async function onTogglePopout(anchor?: PopoutScreenAnchor) {
  notesEditorRef.value?.syncToDraft()
  await togglePopout(undefined, anchor)
}

async function createNote() {
  if (isSearchActive.value) return
  notesEditorRef.value?.syncToDraft()
  await flushDraft()
  try {
    await notesStore.createNote()
  } catch {
    toast.error('创建便笺失败')
  }
}

async function togglePinned() {
  const note = editorNote.value
  if (!note) return
  try {
    await notesStore.updateNote(note.id, { pinned: !note.pinned })
  } catch {
    toast.error('更新置顶状态失败')
  }
}

async function setColor(color: NoteColor) {
  const note = editorNote.value
  if (!note || note.color === color) return
  try {
    await notesStore.updateNote(note.id, { color })
  } catch {
    toast.error('更新颜色失败')
  }
}

async function removeCurrent() {
  const note = editorNote.value
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
  const note = editorNote.value
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
  const note = editorNote.value
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
            <div class="ww-notes-header-actions">
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
              <WwButton
                icon="layers"
                size="small"
                :label="batchLabel"
                class="ww-notes-batch-popout-btn"
                :disabled="scopeCount <= 0"
                @click="toggleAllPopouts"
              />
              <WwButton
                icon="plus"
                size="small"
                label="新建"
                class="ww-notes-create-btn"
                :disabled="isSearchActive"
                v-tooltip.bottom="isSearchActive ? '搜索时请先清空关键词再新建' : undefined"
                @click="createNote"
              />
            </div>
          </template>
        </PageHeader>
      </template>

      <div class="ww-notes-workspace">
        <NotesSidebar
          v-model:searchQuery="searchQuery"
          :notes="notes"
          :visible-notes="listNotes"
          :search-no-match="isSearchNoMatch"
          :selected-note-id="sidebarSelectedId"
          :loading="loading"
          @select="selectNote"
          @action="onSidebarAction"
        />

        <!-- 始终占 2fr 列；隐藏时用 visibility 占位，避免列表被撑满（勿用 v-if/v-show 卸掉整栏） -->
        <div
          class="ww-notes-pane ww-notes-pane--editor"
          :class="{ 'ww-notes-pane--inactive': !showRightPane }"
          :aria-hidden="!showRightPane"
        >
          <NotesEditor
            v-if="editorNote"
            ref="notesEditorRef"
            v-model:draftTitle="draftTitle"
            v-model:draftContent="draftContent"
            :note="editorNote"
            :note-colors="NOTE_COLORS"
            :color-labels="NOTE_COLOR_LABELS"
            :popout-open="isPopoutOpen"
            :popout-toggle-label="popoutToggleLabel"
            @flush="flushDraft"
            @toggle-pinned="togglePinned"
            @set-color="setColor"
            @pick-image="pickImage"
            @insert-image-by-path="insertImageByPath"
            @remove-note="removeCurrent"
            @toggle-popout="onTogglePopout"
          />

          <EmptyState
            v-else-if="showPickHint"
            class="ww-notes-empty ww-notes-empty--pick"
            variant="empty"
            title="选择便笺"
            description="点击左侧便笺进行浏览或编辑"
          />

          <EmptyState
            v-else-if="!loading && notes.length === 0"
            class="ww-notes-empty"
            variant="empty"
            title="还没有便笺"
            description="点击右上角「新建」创建第一条"
          />
        </div>
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

.ww-notes-pane--editor {
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.ww-notes-pane--inactive {
  visibility: hidden;
  pointer-events: none;
}

.ww-notes-pane--editor > :deep(.ww-notes-editor-wrap) {
  flex: 1;
  min-height: 0;
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

.ww-notes-header-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-left: auto;
}

.ww-notes-layout :deep(.ww-notes-create-btn.p-button),
.ww-notes-layout :deep(.ww-notes-batch-popout-btn.p-button) {
  flex: 0 0 auto;
  width: auto;
  min-width: 0;
  min-height: 1.8rem;
  padding-block: 0.2rem;
}

.ww-notes-layout :deep(.ww-notes-batch-popout-btn.p-button) {
  white-space: nowrap;
}

.ww-notes-icon-btn--on {
  color: var(--ww-ink) !important;
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
  flex: 1;
  min-height: 0;
  justify-content: center;
  padding-bottom: clamp(2rem, 10vh, 5rem);
}

.ww-notes-empty--pick :deep(.ww-empty-state__card) {
  transform: translateY(calc(-1 * clamp(0.5rem, 4vh, 2rem)));
}

@media (max-width: 960px) {
  .ww-notes-workspace {
    grid-template-columns: 1fr;
    grid-template-rows: minmax(11rem, 14rem) minmax(0, 1fr);
    gap: 0.625rem;
  }

  .ww-notes-pane--inactive {
    display: none;
  }
}
</style>
