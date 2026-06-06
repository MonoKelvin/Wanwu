<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, provide, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@shared/stores/settings'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import WwIconButton from '@shared/components/WwIconButton.vue'
import NoteColorPicker from '@modules/library/notes/components/NoteColorPicker.vue'
import WwContextMenu from '@shared/components/WwContextMenu.vue'
import ImageViewer from '@shared/components/ImageViewer.vue'
import type { NoteColor, NoteItem } from '@shared/types/notes'
import type { ImageViewerSlide } from '@shared/types/image-viewer'
import type { WwMenuItem } from '@shared/types/menu'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import { POP_TIP_COPY_MESSAGES, usePopTip } from '@shared/composables/usePopTip'
import { toWanwuMediaUrl } from '@shared/utils/profileMedia'
import { resolveImageViewerUrl } from '@shared/markdown/utils/imageViewerUrl'
import {
  NOTE_IMAGE_EDITOR_KEY,
  type NoteImageMenuTarget
} from '@modules/library/notes/lib/noteImageEditorContext'
import { createNoteImageExtension, isSafeExternalHref } from '@modules/library/notes/lib/noteImageExtension'
import {
  canonicalNoteBodyContent,
  normalizeNotePlainText
} from '@modules/library/notes/lib/noteContentText'
import { pickNotePlaceholder } from '@modules/library/notes/lib/notePlaceholders'

const toast = useWanwuToast()
const popTip = usePopTip()
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)
const notesSpellcheckEnabled = computed(() => settings.value.notesSpellcheckEnabled)

const draftTitle = defineModel<string>('draftTitle', { required: true })
const draftContent = defineModel<string>('draftContent', { required: true })

const props = withDefaults(
  defineProps<{
    note: NoteItem
    noteColors: NoteColor[]
    colorLabels: Record<NoteColor, string>
    variant?: 'embedded' | 'popout'
    popoutAlwaysOnTop?: boolean
    popoutOpen?: boolean
    popoutToggleLabel?: string
  }>(),
  {
    variant: 'embedded',
    popoutAlwaysOnTop: false,
    popoutOpen: false,
    popoutToggleLabel: '打开独立窗口'
  }
)

const emit = defineEmits<{
  flush: []
  togglePinned: []
  setColor: [color: NoteColor]
  pickImage: []
  insertImageByPath: [filePath: string]
  removeNote: []
  closePopout: []
  togglePopoutAlwaysOnTop: []
  togglePopout: [anchor?: { x: number; y: number }]
}>()

const isPopout = computed(() => props.variant === 'popout')

/** 正向为将要执行的操作；激活态为点击后的撤销/关闭 */
const listPinActionLabel = computed(() =>
  props.note.pinned ? '取消置顶' : '置顶到列表'
)
const windowTopActionLabel = computed(() =>
  props.popoutAlwaysOnTop ? '取消窗口置顶' : '窗口置顶'
)
const popoutOpenActionLabel = computed(() => props.popoutToggleLabel)

function noteMediaUrl(relativePath: string): string | null {
  return toWanwuMediaUrl(relativePath)
}

const contentStats = computed(() => {
  const raw = normalizeNotePlainText(draftContent.value)
  if (!raw) return '0 字'
  return `${raw.length} 字`
})

const updatedLabel = computed(() =>
  new Date(props.note.updatedAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
)

const pendingInsertImage = ref(false)
const resolvingPasteImage = ref(false)
const imageById = computed(() => {
  const map = new Map<string, { id: string; relativePath: string }>()
  props.note.images.forEach((img) => {
    map.set(img.id, img)
  })
  return map
})
const viewerOpen = ref(false)
const viewerIndex = ref(0)
const viewerSlides = ref<ImageViewerSlide[]>([])
const viewerRevoke = ref<(() => void) | null>(null)
const imageMenuRef = ref<InstanceType<typeof WwContextMenu> | null>(null)
const imageMenuTarget = ref<NoteImageMenuTarget | null>(null)
/** 正在把 store/草稿写入编辑器，避免 onUpdate 回写引发循环 */
let applyingRemote = false

function releaseViewerResource() {
  viewerRevoke.value?.()
  viewerRevoke.value = null
}

async function openImageViewerAt(imageId?: string, fallbackSrc?: string) {
  releaseViewerResource()

  const entries: Array<{ id?: string; src: string }> = []
  for (const img of props.note.images) {
    const src = noteMediaUrl(img.relativePath)
    if (src) entries.push({ id: img.id, src })
  }
  if (!entries.length && fallbackSrc?.trim()) {
    entries.push({ src: fallbackSrc.trim() })
  }
  if (!entries.length) {
    toast.error('无法打开大图')
    return
  }

  let targetIndex = 0
  if (imageId) {
    const byId = entries.findIndex((entry) => entry.id === imageId)
    if (byId >= 0) targetIndex = byId
  } else if (fallbackSrc) {
    const bySrc = entries.findIndex((entry) => entry.src === fallbackSrc)
    if (bySrc >= 0) targetIndex = bySrc
  }

  const slides: ImageViewerSlide[] = []
  const revokes: Array<() => void> = []
  let startIndex = 0

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    try {
      const resolved = await resolveImageViewerUrl(entry.src)
      if (resolved.revoke) revokes.push(resolved.revoke)
      if (i === targetIndex) startIndex = slides.length
      slides.push({ url: resolved.url, alt: '' })
    } catch {
      /* skip broken image */
    }
  }

  if (!slides.length && fallbackSrc?.trim()) {
    try {
      const resolved = await resolveImageViewerUrl(fallbackSrc.trim())
      if (resolved.revoke) revokes.push(resolved.revoke)
      slides.push({ url: resolved.url, alt: '' })
      startIndex = 0
    } catch {
      /* handled below */
    }
  }

  if (!slides.length) {
    toast.error('无法打开大图')
    return
  }

  viewerRevoke.value = revokes.length ? () => revokes.forEach((fn) => fn()) : null
  viewerSlides.value = slides
  viewerIndex.value = Math.min(startIndex, slides.length - 1)
  viewerOpen.value = true
}

async function saveImageAs(src: string) {
  if (!src.trim()) return
  const ext = /\.png/i.test(src) ? 'png' : /\.webp/i.test(src) ? 'webp' : 'jpg'
  const result = await window.wanwu.shell.downloadFile({ url: src, defaultName: `image.${ext}` })
  if (result.ok && result.path) {
    toast.success('图片已保存', undefined, { action: toast.revealInFolderAction(result.path) })
  } else if (!result.canceled) {
    toast.error(result.error ?? '保存失败')
  }
}

async function copyImageToClipboard(src: string) {
  if (!src.trim()) return
  try {
    const result = await window.wanwu.shell.copyImage(src)
    if (result.ok) {
      popTip.show(POP_TIP_COPY_MESSAGES.image)
      return
    }
    toast.error(result.error === 'not_found' ? '找不到图片文件' : '复制失败')
  } catch {
    toast.error('复制失败')
  }
}

function openImageMenu(payload: { event: MouseEvent; target: NoteImageMenuTarget }) {
  imageMenuTarget.value = payload.target
  void imageMenuRef.value?.show(payload.event)
}

const imageMenuItems = computed((): WwMenuItem[] => {
  const target = imageMenuTarget.value
  if (!target) return []
  const align = target.align
  return [
    {
      label: '查看大图',
      wwIcon: 'maximize',
      command: () => void openImageViewerAt(target.imageId || undefined, target.src || undefined)
    },
    {
      label: '复制',
      wwIcon: 'copy',
      command: () => void copyImageToClipboard(target.src)
    },
    {
      label: '另存为',
      wwIcon: 'download',
      command: () => void saveImageAs(target.src)
    },
    {
      label: '删除',
      wwIcon: 'trash-2',
      command: () => target.remove()
    },
    { separator: true },
    {
      label: '左对齐',
      checked: align === 'left',
      command: () => target.updateAlign('left')
    },
    {
      label: '居中对齐',
      checked: align === 'center',
      command: () => target.updateAlign('center')
    },
    {
      label: '右对齐',
      checked: align === 'right',
      command: () => target.updateAlign('right')
    }
  ]
})

provide(NOTE_IMAGE_EDITOR_KEY, {
  openViewer: (imageId?: string, src?: string) => {
    void openImageViewerAt(imageId, src)
  },
  openImageMenu
})

/** 切换便笺时重新抽取；同一条便笺内保持当前提示不变 */
const bodyPlaceholder = ref(pickNotePlaceholder())

function refreshBodyPlaceholder() {
  bodyPlaceholder.value = pickNotePlaceholder()
  const instance = editor.value
  if (!instance?.isEmpty) return
  instance.view.dispatch(instance.state.tr)
}

const NoteImageExtension = createNoteImageExtension()

const editor = useEditor({
  extensions: [
    StarterKit,
    Placeholder.configure({
      placeholder: () => bodyPlaceholder.value,
      emptyEditorClass: 'is-editor-empty'
    }),
    NoteImageExtension,
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      enableClickSelection: true,
      defaultProtocol: 'https',
      HTMLAttributes: {
        rel: 'noopener noreferrer'
      }
    })
  ],
  content: normalizeEditorHtml(draftContent.value),
  editorProps: {
    attributes: {
      spellcheck: 'false'
    },
    handleClick: (_view, _pos, event) => {
      const mouseEvent = event as MouseEvent
      const target = mouseEvent.target
      if (!(target instanceof HTMLElement)) return false
      const anchor = target.closest('a[href]') as HTMLAnchorElement | null
      if (!anchor) return false
      if (!mouseEvent.ctrlKey && !mouseEvent.metaKey) return false
      const href = anchor.getAttribute('href')
      if (!href || !isSafeExternalHref(href)) return false
      void window.wanwu.shell.openExternal(href)
      return true
    }
  },
  onUpdate: ({ editor: current }) => {
    if (applyingRemote) return
    syncToDraftFromEditor(current)
  }
})

function editorHtmlToDraftContent(html: string): string {
  return canonicalNoteBodyContent(normalizeEditorHtml(html))
}

function syncToDraftFromEditor(
  instance: { getHTML: () => string },
  opts?: { force?: boolean }
) {
  const next = editorHtmlToDraftContent(instance.getHTML())
  const current = canonicalNoteBodyContent(draftContent.value)
  if (!opts?.force && next === current) return
  draftContent.value = next
}

/** 落盘前由父级调用，确保草稿与编辑器 ProseMirror 状态一致 */
function syncToDraft() {
  if (!editor.value) return
  syncToDraftFromEditor(editor.value, { force: true })
}

function destroyEditor() {
  const instance = editor.value
  if (!instance || instance.isDestroyed) return
  viewerOpen.value = false
  viewerSlides.value = []
  releaseViewerResource()
  imageMenuRef.value?.hide()
  if (instance.view?.dom) {
    unbindEditorDomListeners(instance.view.dom)
  }
  instance.destroy()
}

defineExpose({ syncToDraft, hydrateFromDraft: hydrateEditorFromDraft, destroyEditor })

async function hydrateEditorFromDraft() {
  await nextTick()
  if (!editor.value) return
  applyingRemote = true
  const html = normalizeEditorHtml(draftContent.value)
  if (editor.value.getHTML() !== html) {
    editor.value.commands.setContent(html, { emitUpdate: false })
  }
  await nextTick()
  applyingRemote = false
}

/** 以 props.note（store）为准同步草稿并灌入 Tiptap，避免搜索场景下父级草稿时序问题 */
function applyNoteToEditor(note: NoteItem) {
  applyingRemote = true
  draftTitle.value = note.title ?? ''
  draftContent.value = canonicalNoteBodyContent(note.content ?? '')
  void hydrateEditorFromDraft().finally(() => {
    applyingRemote = false
  })
}

watch(
  () => props.note.id,
  (id, prevId) => {
    if (prevId !== undefined && id === prevId) return
    refreshBodyPlaceholder()
    applyNoteToEditor(props.note)
  },
  { immediate: true }
)

watch(
  () => props.note.updatedAt,
  () => {
    const storeContent = canonicalNoteBodyContent(props.note.content ?? '')
    const draft = canonicalNoteBodyContent(draftContent.value)
    if (storeContent !== draft) return
    void hydrateEditorFromDraft()
  }
)

/** 用稳定字符串作 watch 源，避免 store 每次 updateNote 替换数组引用导致误触发 */
const noteImageIdsKey = computed(() =>
  props.note.images
    .map((img) => img.id)
    .sort()
    .join('\u0001')
)

watch(
  noteImageIdsKey,
  (nextKey, prevKey) => {
    if (!editor.value) return
    const nextIds = nextKey ? nextKey.split('\u0001') : []
    removeMissingImageNodes(new Set(nextIds))
    if (!pendingInsertImage.value) return
    const prevIds = prevKey ? prevKey.split('\u0001') : []
    const newImageId = nextIds.find((id) => !prevIds.includes(id))
    if (newImageId) {
      insertImageNode(newImageId)
    }
    pendingInsertImage.value = false
  },
  { immediate: true }
)

function normalizeEditorHtml(content: string): string {
  const raw = content.trim()
  if (!raw) return '<p></p>'
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw
  const escaped = raw
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replace(/\r?\n/g, '<br>')
  return `<p>${escaped}</p>`
}

function insertImageNode(imageId: string) {
  if (!editor.value) return
  const image = imageById.value.get(imageId)
  if (!image) return
  const src = noteMediaUrl(image.relativePath)
  if (!src) return
  editor.value
    .chain()
    .focus()
    .insertContent({
      type: 'noteImage',
      attrs: {
        src,
        imageId
      }
    })
    .insertContent(' ')
    .run()
}

function removeMissingImageNodes(validIds: Set<string>) {
  if (!editor.value) return
  const tr = editor.value.state.tr
  const toDelete: Array<{ from: number; to: number }> = []
  editor.value.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'noteImage') return
    const imageId = String((node.attrs.imageId as string | undefined) ?? '')
    if (!imageId || validIds.has(imageId)) return
    toDelete.push({ from: pos, to: pos + node.nodeSize })
  })
  if (toDelete.length === 0) return
  toDelete.reverse().forEach(({ from, to }) => tr.delete(from, to))
  editor.value.view.dispatch(tr)
}

function handlePickImage() {
  pendingInsertImage.value = true
  emit('pickImage')
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read_failed'))
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.readAsDataURL(file)
  })
}

async function insertImageFromClipboardFile(file: File) {
  if (resolvingPasteImage.value) return
  resolvingPasteImage.value = true
  try {
    const dataUrl = await fileToDataUrl(file)
    const saved = await window.wanwu.shell.saveClipboardImageDataUrlToTemp({ dataUrl })
    if (!saved.ok || !saved.path) return
    pendingInsertImage.value = true
    emit('insertImageByPath', saved.path)
  } finally {
    resolvingPasteImage.value = false
  }
}

function extractImagePathFromClipboardText(raw: string): string | null {
  const text = raw.trim().replace(/^['"]|['"]$/g, '')
  if (!text) return null
  if (/^file:\/\//i.test(text)) return text
  if (!/[\\/]/.test(text)) return null
  const okExt = /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(text)
  if (!okExt) return null
  return text
}

async function handleEditorPaste(event: ClipboardEvent) {
  const clipboard = event.clipboardData
  if (!clipboard) return
  for (const item of Array.from(clipboard.items)) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (!file) continue
      event.preventDefault()
      await insertImageFromClipboardFile(file)
      return
    }
  }
  const maybePath = extractImagePathFromClipboardText(clipboard.getData('text/plain') || '')
  if (!maybePath) return
  event.preventDefault()
  pendingInsertImage.value = true
  emit('insertImageByPath', maybePath)
}

const editorPasteListener: EventListener = (event) => {
  void handleEditorPaste(event as ClipboardEvent)
}

function applyEditorSpellcheck(dom: HTMLElement) {
  dom.spellcheck = notesSpellcheckEnabled.value
}

function bindEditorDomListeners(dom: HTMLElement) {
  dom.addEventListener('paste', editorPasteListener)
  applyEditorSpellcheck(dom)
}

function unbindEditorDomListeners(dom: HTMLElement) {
  dom.removeEventListener('paste', editorPasteListener)
}

watch(viewerOpen, (open) => {
  if (!open) {
    viewerSlides.value = []
    releaseViewerResource()
  }
})

watch(
  () => props.note.id,
  () => {
    viewerOpen.value = false
    viewerSlides.value = []
    releaseViewerResource()
  }
)

watch(notesSpellcheckEnabled, (enabled) => {
  const dom = editor.value?.view?.dom
  if (dom) dom.spellcheck = enabled
})

watch(
  () => editor.value,
  (instance, prev) => {
    if (prev?.view?.dom) {
      unbindEditorDomListeners(prev.view.dom)
    }
    if (instance?.view?.dom) {
      bindEditorDomListeners(instance.view.dom)
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  destroyEditor()
})
</script>

<template>
  <section
    class="ww-notes-editor-wrap"
    :class="{ 'ww-notes-editor-wrap--popout': isPopout }"
    aria-label="便笺编辑"
  >
    <article class="ww-notes-editor" :class="[`is-${note.color}`, { 'is-popout': isPopout }]">
      <header
        class="ww-notes-editor__bar"
        :class="{ 'ww-notes-editor__bar--popout': isPopout }"
      >
        <template v-if="isPopout">
          <NoteColorPicker
            class="ww-notes-editor__color-picker"
            :model-value="note.color"
            :colors="noteColors"
            :labels="colorLabels"
            @update:model-value="emit('setColor', $event)"
          />
          <div class="ww-notes-editor__actions ww-notes-editor__actions--popout">
            <WwIconButton
              :icon="note.pinned ? 'arrow-down-from-line' : 'arrow-up-to-line'"
              compact
              class="ww-notes-icon-btn--note-accent"
              :class="{ 'ww-notes-icon-btn--on': note.pinned }"
              :ariaLabel="listPinActionLabel"
              v-tooltip.bottom="listPinActionLabel"
              @click="emit('togglePinned')"
            />
            <WwIconButton
              icon="image"
              compact
              ariaLabel="添加图片"
              v-tooltip.bottom="'添加图片'"
              @click="handlePickImage"
            />
            <WwIconButton
              :icon="popoutAlwaysOnTop ? 'pin-off' : 'pin'"
              compact
              class="ww-notes-icon-btn--note-accent"
              :class="{ 'ww-notes-icon-btn--on': popoutAlwaysOnTop }"
              :ariaLabel="windowTopActionLabel"
              v-tooltip.bottom="windowTopActionLabel"
              @click="emit('togglePopoutAlwaysOnTop')"
            />
            <WwIconButton
              icon="x"
              compact
              ariaLabel="关闭独立窗口"
              v-tooltip.bottom="'关闭'"
              @click="emit('closePopout')"
            />
          </div>
        </template>
        <template v-else>
          <div class="ww-notes-colors" role="group" aria-label="便笺颜色">
            <button
              v-for="c in noteColors"
              :key="c"
              type="button"
              class="ww-notes-color"
              :class="[`is-${c}`, { 'is-selected': note.color === c }]"
              :aria-label="`${colorLabels[c]}${note.color === c ? '（当前）' : ''}`"
              :aria-pressed="note.color === c"
              @click="emit('setColor', c)"
            />
          </div>

          <div class="ww-notes-editor__actions">
            <span class="ww-notes-editor__meta">更新于 {{ updatedLabel }}</span>
            <WwIconButton
              :icon="popoutOpen ? 'square-arrow-up-left' : 'external-link'"
              compact
              class="ww-notes-icon-btn--note-accent"
              :class="{ 'ww-notes-icon-btn--on': popoutOpen }"
              :ariaLabel="popoutOpenActionLabel"
              v-tooltip.bottom="popoutOpenActionLabel"
              @click="(event: MouseEvent) => emit('togglePopout', { x: event.screenX, y: event.screenY })"
            />
            <WwIconButton
              :icon="note.pinned ? 'arrow-down-from-line' : 'arrow-up-to-line'"
              compact
              class="ww-notes-icon-btn--note-accent"
              :class="{ 'ww-notes-icon-btn--on': note.pinned }"
              :ariaLabel="listPinActionLabel"
              v-tooltip.bottom="listPinActionLabel"
              @click="emit('togglePinned')"
            />
            <WwIconButton
              icon="image"
              compact
              ariaLabel="添加图片"
              v-tooltip.bottom="'添加图片'"
              @click="handlePickImage"
            />
            <WwIconButton
              icon="trash-2"
              compact
              ariaLabel="删除便笺"
              v-tooltip.bottom="'删除'"
              @click="emit('removeNote')"
            />
          </div>
        </template>
      </header>

      <div class="ww-notes-editor__body">
        <input
          v-model="draftTitle"
          class="ww-notes-editor__title"
          maxlength="80"
          placeholder="标题"
          aria-label="便笺标题"
          :spellcheck="notesSpellcheckEnabled"
          @blur="emit('flush')"
        />
        <EditorContent
          :editor="editor"
          class="ww-notes-editor__content ww-scroll-main"
          aria-label="便笺正文"
          @blur="emit('flush')"
        />
        <div class="ww-notes-editor__foot" :class="{ 'ww-notes-editor__foot--popout': isPopout }">
          <span v-if="isPopout" class="ww-notes-editor__meta">更新于 {{ updatedLabel }}</span>
          <span class="ww-notes-editor__stats">{{ contentStats }}</span>
        </div>
      </div>
    </article>
    <ImageViewer v-model:open="viewerOpen" v-model:index="viewerIndex" :slides="viewerSlides" />
    <WwContextMenu ref="imageMenuRef" :model="imageMenuItems" />
  </section>
</template>

<style scoped>
@import './NotesEditor.css';
</style>
