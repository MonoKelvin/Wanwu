<script setup lang="ts">
defineOptions({ name: 'LibraryNotesView' })

import { computed, onMounted, ref } from 'vue'
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

const NOTE_COLORS: NoteColor[] = ['yellow', 'green', 'blue', 'pink', 'purple', 'gray']
const COLOR_LABELS: Record<NoteColor, string> = {
  yellow: '黄色',
  green: '绿色',
  blue: '蓝色',
  pink: '粉色',
  purple: '紫色',
  gray: '灰色'
}

const notesStore = useNotesStore()
const toast = useWanwuToast()
const confirm = useWanwuConfirm()

const searchQuery = ref('')
const draftTitle = ref('')
const draftContent = ref('')
const selected = computed(() => notesStore.selectedNote)

const { flushDraft } = useNotesDraft({
  selected,
  draftTitle,
  draftContent,
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

async function createNote() {
  try {
    await notesStore.createNote()
  } catch {
    toast.error('创建便笺失败')
  }
}

async function selectNote(id: string) {
  if (notesStore.selectedNoteId === id) return
  await flushDraft()
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

async function removeImage(imageId: string) {
  try {
    await notesStore.removeImage(imageId)
  } catch {
    toast.error('移除图片失败')
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden">
    <ModulePageLayout class="ww-notes-layout min-h-0 flex-1">
      <template #header>
        <PageHeader title="便笺" subtitle="轻量记录，自动保存" stacked-titles>
          <template #actions>
            <span
              v-if="notesStore.saving"
              class="ww-notes-save-hint"
              role="status"
              aria-live="polite"
            >
              <span class="ww-notes-save-hint__dot" aria-hidden="true" />
              保存中
            </span>
            <WwButton icon="plus" size="small" label="新建" @click="createNote" />
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
        />

        <NotesEditor
          v-if="selected"
          v-model:draftTitle="draftTitle"
          v-model:draftContent="draftContent"
          :note="selected"
          :note-colors="NOTE_COLORS"
          :color-labels="COLOR_LABELS"
          @flush="flushDraft"
          @toggle-pinned="togglePinned"
          @set-color="setColor"
          @pick-image="pickImage"
          @remove-image="removeImage"
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
  padding: 0;
  flex: 1;
  min-height: 0;
  display: flex;
}

.ww-notes-workspace {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(13.5rem, 17.5rem) minmax(0, 1fr);
  gap: 0.75rem;
  padding: 0.75rem var(--ww-page-padding) var(--ww-page-padding);
}

.ww-notes-save-hint {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  margin-right: 0.5rem;
  font-size: 0.75rem;
  color: var(--ww-ink-faint);
}

.ww-notes-save-hint__dot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 50%;
  background: var(--ww-ink-faint);
  animation: ww-notes-pulse 1.2s ease-in-out infinite;
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
    grid-template-rows: minmax(10rem, 14rem) minmax(0, 1fr);
  }
}
</style>
