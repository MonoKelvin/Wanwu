<script setup lang="ts">
defineOptions({ name: 'LibraryNotesView' })

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ModulePageLayout from '@app/components/ModulePageLayout.vue'
import PageHeader from '@app/components/PageHeader.vue'
import EmptyState from '@app/components/EmptyState.vue'
import WwButton from '@shared/components/WwButton.vue'
import { useNotePopout, type PopoutScreenAnchor } from '@modules/library/notes/lib/useNotePopout'
import { readNoteEditorScrollTop } from '@modules/library/notes/lib/useNotePopoutScroll'
import { useNotePopoutsBatch } from '@modules/library/notes/lib/useNotePopoutsBatch'
import { useNotePopoutAutoRestoreOnEnter } from '@modules/library/notes/lib/useNotePopoutAutoRestore'
import { useNotesBrowse } from '@modules/library/notes/lib/useNotesBrowse'
import { NOTE_COLORS, NOTE_COLOR_LABELS } from '@shared/constants/noteColors'
import { pruneUnreferencedNoteImages } from '@modules/library/notes/app/pruneNoteImages'
import { useNotesStore } from '@shared/stores/notes'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import NotesSidebar from '@modules/library/notes/components/NotesSidebar.vue'
import NotesEditor from '@modules/library/notes/components/NotesEditor.vue'
import { useNotesDraft } from '@modules/library/notes/lib/useNotesDraft'
import { registerNotePopoutSelectHandler } from '@modules/library/notes/lib/notePopoutSync'
import {
  registerNotesEditorDestroy,
  registerNotesNavigationSync
} from '@modules/library/notes/lib/notesEditorLifecycle'
import { notesEditorMountAllowed } from '@modules/library/notes/lib/notesEditorLifecycle'
import { useNotesActions, useNoteEditorActions } from '@modules/library/notes/lib/useNotesActions'
import { useNotesSelection } from '@modules/library/notes/lib/useNotesSelection'
import { useNoteEditorSync } from '@modules/library/notes/lib/noteEditorSync'

const notesStore = useNotesStore()
const toast = useWanwuToast()

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
const editorSessionKey = ref(0)

const editorNote = computed(() => {
  const id = selectedNoteId.value
  if (!id) return null
  return notes.value.find((n) => n.id === id) ?? null
})

const showEditor = computed(() => Boolean(editorNote.value))

const syncDraftFromEditor = () => {
  notesEditorRef.value?.syncToDraft()
}

/** 以当前编辑器便笺为准，避免 selectedNoteId 与列表短暂不同步时无法打开独立窗口 */
const popoutNoteId = computed(() => editorNote.value?.id ?? selectedNoteId.value)
const { isPopoutVisible, popoutToggleLabel, togglePopout } = useNotePopout(popoutNoteId)
const { batchDisabled, batchLabel, refreshBatchState, toggleAllPopouts } = useNotePopoutsBatch()

useNotePopoutAutoRestoreOnEnter()

const headerSubtitle = computed(() => {
  const total = notes.value.length
  if (loading.value) return '正在加载便笺...'
  if (total === 0) return '轻量记录，自动保存'
  const pinnedCount = notes.value.filter((item) => item.pinned).length
  return `共 ${total} 条${pinnedCount > 0 ? `，置顶 ${pinnedCount} 条` : ''}`
})

const hydrateEditor = () => {
  notesEditorRef.value?.hydrateFromDraft?.()
}

const {
  saveUiState,
  saveUiLabel,
  saveUiVisible,
  saveUiCancellable,
  cancelSave,
  flushDraft,
  applyRemoteNote
} = useNotesDraft({
  selected: editorNote,
  draftTitle,
  draftContent,
  beforePersist: syncDraftFromEditor,
  onRemoteApplied: hydrateEditor,
  persist: async (noteId, title, content, options) => {
    await notesStore.updateNote(noteId, { title, content, touchUpdatedAt: options?.touchUpdatedAt })
  },
  onPersistError: () => {
    toast.error('便笺保存失败，请稍后重试')
  }
})

const notesActions = useNotesActions({ beforeMutate: syncDraftFromEditor })

const { selectNote } = useNotesSelection({
  selectedNoteId,
  notes,
  showEditor,
  isSearchActive,
  pickedInSearch,
  markPickedInSearch,
  draftContent,
  syncDraft: syncDraftFromEditor,
  flushDraft,
  hydrateEditor: () => notesEditorRef.value?.hydrateFromDraft?.(),
  removeImage: (imageId) => notesStore.removeImage(imageId)
})

const editorActions = useNoteEditorActions({
  getNoteId: () => editorNote.value?.id,
  syncDraft: syncDraftFromEditor
})

useNoteEditorSync({
  getNoteId: () => editorNote.value?.id,
  applyRemoteNote,
  hydrateEditor
})

const unregisterNotesNavigationSync = registerNotesNavigationSync(syncDraftFromEditor)
const unregisterNotesEditorDestroy = registerNotesEditorDestroy(() => {
  notesEditorRef.value?.destroyEditor()
})

onMounted(async () => {
  const result = await notesActions.loadAll()
  if (!result.ok) {
    toast.error('加载便笺失败')
  }
})

watch(
  () => notes.value.length,
  (count, prevCount) => {
    if (count === 0) {
      editorSessionKey.value += 1
    } else if ((prevCount ?? 0) === 0 && count > 0) {
      editorSessionKey.value += 1
    }
  }
)

const unregisterPopoutSelectHandler = registerNotePopoutSelectHandler((id) => selectNote(id))

onBeforeUnmount(() => {
  unregisterNotesNavigationSync()
  unregisterNotesEditorDestroy()
  unregisterPopoutSelectHandler()
  const noteId = notesStore.selectedNoteId
  const content = draftContent.value
  const note = noteId ? notesStore.notes.find((item) => item.id === noteId) : null
  syncDraftFromEditor()
  void flushDraft().then(() => {
    if (note) {
      void pruneUnreferencedNoteImages(note.images, content, (imageId) =>
        notesStore.removeImage(imageId)
      )
    }
  })
})

async function onTogglePopout(anchor?: PopoutScreenAnchor) {
  if (!popoutNoteId.value) return
  syncDraftFromEditor()
  await flushDraft()
  await togglePopout(readNoteEditorScrollTop(), anchor)
  await refreshBatchState()
}

async function createNote() {
  if (isSearchActive.value) return
  syncDraftFromEditor()
  await flushDraft()
  await notesActions.createNote()
}

async function removeCurrent() {
  const note = editorNote.value
  if (!note) return
  if (selectedNoteId.value === note.id) {
    syncDraftFromEditor()
    await flushDraft()
  }
  await notesActions.deleteNote(note.id)
}

async function removeById(noteId: string) {
  const note = notesStore.notes.find((item) => item.id === noteId)
  if (!note) return
  if (selectedNoteId.value === noteId) {
    syncDraftFromEditor()
    await flushDraft()
  }
  await notesActions.deleteNote(noteId, {
    message: `确定删除「${note.title.trim() || '未命名便笺'}」吗？删除后无法恢复。`
  })
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
    await notesActions.copyContent(payload.noteId)
    return
  }
  if (payload.action === 'toggle-pinned') {
    await notesActions.togglePinned(payload.noteId)
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
                :disabled="batchDisabled"
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

        <div
          class="ww-notes-pane ww-notes-pane--editor"
          :class="{ 'ww-notes-pane--inactive': !showRightPane }"
          :aria-hidden="!showRightPane"
        >
          <NotesEditor
            v-if="showEditor && notesEditorMountAllowed"
            :key="editorSessionKey"
            ref="notesEditorRef"
            v-model:draftTitle="draftTitle"
            v-model:draftContent="draftContent"
            :note="editorNote!"
            :note-colors="NOTE_COLORS"
            :color-labels="NOTE_COLOR_LABELS"
            :popout-open="isPopoutVisible"
            :popout-toggle-label="popoutToggleLabel"
            @flush="flushDraft"
            @toggle-pinned="editorActions.togglePinned"
            @set-color="editorActions.setColor"
            @pick-image="editorActions.pickImage"
            @insert-image-by-path="editorActions.insertImageByPath"
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
.ww-notes-layout :deep(.ww-module-layout__body) {
  overflow: hidden;
}

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

.ww-notes-layout :deep(.ww-notes-batch-popout-btn.p-button:disabled) {
  opacity: 0.42;
  cursor: not-allowed;
  pointer-events: none;
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
