<script setup lang="ts">
defineOptions({ name: 'NotePopoutView' })

import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import NotesEditor from '@modules/library/notes/components/NotesEditor.vue'
import { useNotesDraft } from '@modules/library/notes/lib/useNotesDraft'
import { useNotePopout } from '@modules/library/notes/lib/useNotePopout'
import {
  readNoteEditorScrollTop,
  useNotePopoutScrollPersistence
} from '@modules/library/notes/lib/useNotePopoutScroll'
import { collectNoteImageIdsFromHtml } from '@modules/library/notes/lib/noteImageContent'
import { useNotesStore } from '@shared/stores/notes'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import type { NoteColor } from '@shared/types/notes'

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

const route = useRoute()
const notesStore = useNotesStore()
const toast = useWanwuToast()

const noteId = computed(() => String(route.params.noteId ?? ''))
const draftTitle = ref('')
const draftContent = ref('')
const notesEditorRef = ref<InstanceType<typeof NotesEditor> | null>(null)

const selected = computed(() => notesStore.notes.find((n) => n.id === noteId.value) ?? null)

const {
  alwaysOnTop,
  toggleAlwaysOnTop,
  closeCurrentPopout,
  refreshState
} = useNotePopout(noteId)

useNotePopoutScrollPersistence(() => noteId.value)

async function handleClosePopout() {
  await flushDraft()
  await closeCurrentPopout(readNoteEditorScrollTop())
}

const IMAGE_PRUNE_GRACE_MS = 3000

async function pruneUnreferencedNoteImages(contentHtml: string) {
  const id = noteId.value
  if (!id) return
  const referenced = collectNoteImageIdsFromHtml(contentHtml)
  const note = notesStore.notes.find((item) => item.id === id)
  if (!note) return
  const now = Date.now()
  for (const image of [...note.images]) {
    if (referenced.has(image.id)) continue
    const age = now - new Date(image.createdAt).getTime()
    if (!Number.isFinite(age) || age < IMAGE_PRUNE_GRACE_MS) continue
    await notesStore.removeImage(image.id)
  }
}

const { flushDraft } = useNotesDraft({
  selected,
  draftTitle,
  draftContent,
  beforePersist: () => {
    notesEditorRef.value?.syncToDraft()
  },
  persist: async (id, title, content) => {
    await notesStore.updateNote(id, { title, content })
  },
  onPersistError: () => {
    toast.error('便笺保存失败，请稍后重试')
  }
})

async function signalPopoutRendererReady() {
  await nextTick()
  window.wanwu.notes.popout.rendererReady()
}

onMounted(async () => {
  notesStore.bindRemoteSync()
  if (!notesStore.notes.length && !notesStore.loading) {
    try {
      await notesStore.loadAll()
    } catch {
      toast.error('加载便笺失败')
    }
  }
  await refreshState()
  await signalPopoutRendererReady()
})

onBeforeUnmount(async () => {
  const content = draftContent.value
  await flushDraft()
  if (noteId.value) {
    await pruneUnreferencedNoteImages(content)
  }
})

watch(
  () => selected.value?.id,
  (id) => {
    if (!id && noteId.value) {
      void handleClosePopout()
    }
  }
)

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
</script>

<template>
  <div class="ww-note-popout-view">
    <NotesEditor
      v-if="selected"
      ref="notesEditorRef"
      variant="popout"
      v-model:draftTitle="draftTitle"
      v-model:draftContent="draftContent"
      :note="selected"
      :note-colors="NOTE_COLORS"
      :color-labels="COLOR_LABELS"
      :popout-always-on-top="alwaysOnTop"
      @flush="flushDraft"
      @toggle-pinned="togglePinned"
      @set-color="setColor"
      @pick-image="pickImage"
      @insert-image-by-path="insertImageByPath"
      @close-popout="handleClosePopout"
      @toggle-popout-always-on-top="toggleAlwaysOnTop"
    />
    <p v-else class="ww-note-popout-view__missing">便笺不存在或已删除</p>
  </div>
</template>

<style scoped>
.ww-note-popout-view {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: transparent;
}

.ww-note-popout-view__missing {
  margin: auto;
  padding: 1rem;
  font-size: 0.875rem;
  color: var(--ww-ink-muted);
  text-align: center;
}
</style>
