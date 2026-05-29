<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, provide, ref, watch } from 'vue'
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

defineExpose({ syncToDraft, hydrateFromDraft: hydrateEditorFromDraft })

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

function bindEditorDomListeners(dom: HTMLElement) {
  dom.addEventListener('paste', editorPasteListener)
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
  if (editor.value?.view?.dom) {
    unbindEditorDomListeners(editor.value.view.dom)
  }
  editor.value?.destroy()
  releaseViewerResource()
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
.ww-notes-editor-wrap {
  width: 100%;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex: 1;
}

.ww-notes-editor-wrap--popout {
  flex: 1;
  height: 100%;
  background: transparent;
}

.ww-notes-editor {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ww-border-subtle);
  border-radius: 0.875rem;
  background: var(--ww-content);
  overflow: hidden;
  container-type: inline-size;
  container-name: notes-editor;
}

.ww-notes-editor::before {
  content: '';
  display: block;
  height: 3px;
  flex-shrink: 0;
  background: var(--ww-notes-accent, var(--ww-ink-faint));
}

.ww-notes-editor.is-yellow {
  --ww-notes-accent: #d6a21e;
}
.ww-notes-editor.is-green {
  --ww-notes-accent: #2f9b72;
}
.ww-notes-editor.is-blue {
  --ww-notes-accent: #3f7ed8;
}
.ww-notes-editor.is-pink {
  --ww-notes-accent: #d95f8f;
}
.ww-notes-editor.is-purple {
  --ww-notes-accent: #7f63d9;
}
.ww-notes-editor.is-gray {
  --ww-notes-accent: #7f8798;
}
.ww-notes-editor.is-orange {
  --ww-notes-accent: #dd7b23;
}
.ww-notes-editor.is-teal {
  --ww-notes-accent: #14918a;
}
.ww-notes-editor.is-red {
  --ww-notes-accent: #d84f4a;
}

.ww-notes-editor.is-popout {
  --ww-notes-popout-pad-x: 0.75rem;
  --ww-notes-popout-toolbar-pad-y: 0.1875rem;
  --ww-notes-popout-text-inset: 0.125rem;
  border: none;
  border-radius: 0;
  box-shadow: none;
  background: color-mix(in oklab, var(--ww-content) 78%, var(--ww-notes-accent) 22%);
}

.ww-notes-editor.is-popout .ww-notes-editor__bar {
  background: color-mix(in oklab, var(--ww-content) 78%, var(--ww-notes-accent) 22%);
}

.ww-notes-editor__bar--popout {
  -webkit-app-region: drag;
}

.ww-notes-editor__bar--popout .ww-notes-editor__color-picker {
  flex: 0 0 auto;
  margin-right: auto;
  -webkit-app-region: no-drag;
}

.ww-notes-editor__bar--popout .ww-notes-editor__actions--popout {
  flex: 0 0 auto;
  margin-left: auto;
  -webkit-app-region: no-drag;
}

.ww-notes-editor.is-popout .ww-notes-editor__body {
  padding: 0.625rem var(--ww-notes-popout-pad-x) 0.5rem;
  gap: 0.375rem;
  background: transparent;
}

.ww-notes-editor.is-popout .ww-notes-editor__title {
  min-height: 1.5rem;
  margin-top: 0.125rem;
  padding: 0.125rem 0 0 var(--ww-notes-popout-text-inset);
  font-size: 0.9375rem;
  line-height: 1.35;
}

.ww-notes-editor.is-popout .ww-notes-editor__content {
  min-height: 9rem;
  padding: 0.25rem 0 0 var(--ww-notes-popout-text-inset);
  font-size: 0.8125rem;
  line-height: 1.55;
}

.ww-notes-editor__foot--popout {
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.ww-notes-editor__foot--popout .ww-notes-editor__meta {
  margin-right: 0;
  flex: 1 1 auto;
  min-width: 0;
}

.ww-notes-editor__stats {
  flex-shrink: 0;
}

[data-theme='dark'] .ww-notes-editor.is-yellow {
  --ww-notes-accent: #e3b236;
}
[data-theme='dark'] .ww-notes-editor.is-green {
  --ww-notes-accent: #4ab68a;
}
[data-theme='dark'] .ww-notes-editor.is-blue {
  --ww-notes-accent: #6ba2f0;
}
[data-theme='dark'] .ww-notes-editor.is-pink {
  --ww-notes-accent: #ec84ae;
}
[data-theme='dark'] .ww-notes-editor.is-purple {
  --ww-notes-accent: #a895ef;
}
[data-theme='dark'] .ww-notes-editor.is-gray {
  --ww-notes-accent: #98a2b3;
}
[data-theme='dark'] .ww-notes-editor.is-orange {
  --ww-notes-accent: #f2a04a;
}
[data-theme='dark'] .ww-notes-editor.is-teal {
  --ww-notes-accent: #3bc3ba;
}
[data-theme='dark'] .ww-notes-editor.is-red {
  --ww-notes-accent: #f58884;
}

[data-theme='dark'] .ww-notes-editor.is-popout {
  background: color-mix(in oklab, var(--ww-content) 84%, var(--ww-notes-accent) 16%);
}

[data-theme='dark'] .ww-notes-editor.is-popout .ww-notes-editor__bar {
  background: color-mix(in oklab, var(--ww-content) 84%, var(--ww-notes-accent) 16%);
}

.ww-notes-editor__bar {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  column-gap: 0.75rem;
  row-gap: 0.5rem;
  min-height: 3.25rem;
  min-width: 0;
  padding: 0.75rem 1.625rem;
  border-bottom: 1px solid var(--ww-border-subtle);
}

/* 独立窗口：覆盖上方通用工具栏间距，与正文区水平边距一致 */
.ww-notes-editor.is-popout .ww-notes-editor__bar {
  flex-wrap: nowrap;
  justify-content: flex-start;
  column-gap: 0;
  row-gap: 0;
  gap: 0.375rem;
  min-height: 1.75rem;
  padding: var(--ww-notes-popout-toolbar-pad-y) var(--ww-notes-popout-pad-x);
  border-bottom: none;
}

.ww-notes-colors {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  align-content: center;
  gap: 0.375rem;
  flex: 1 1 auto;
  min-width: 0;
  margin-right: auto;
}

.ww-notes-color {
  width: 1.125rem;
  height: 1.125rem;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  transition:
    transform var(--ww-duration-fast) var(--ww-ease-out),
    box-shadow var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-notes-color:hover {
  transform: scale(1.08);
}

.ww-notes-color.is-selected {
  box-shadow: 0 0 0 1px var(--ww-content), 0 0 0 2px var(--ww-ink-muted);
}

.ww-notes-color.is-yellow {
  background: #dfb749;
}
.ww-notes-color.is-green {
  background: #4ab68a;
}
.ww-notes-color.is-blue {
  background: #6a9fea;
}
.ww-notes-color.is-pink {
  background: #e988b2;
}
.ww-notes-color.is-purple {
  background: #aa95ea;
}
.ww-notes-color.is-gray {
  background: #95a0b2;
}
.ww-notes-color.is-orange {
  background: #ec9d56;
}
.ww-notes-color.is-teal {
  background: #48c2ba;
}
.ww-notes-color.is-red {
  background: #e9827d;
}

[data-theme='dark'] .ww-notes-color.is-yellow {
  background: #e3b236;
}
[data-theme='dark'] .ww-notes-color.is-green {
  background: #4ab68a;
}
[data-theme='dark'] .ww-notes-color.is-blue {
  background: #6ba2f0;
}
[data-theme='dark'] .ww-notes-color.is-pink {
  background: #ec84ae;
}
[data-theme='dark'] .ww-notes-color.is-purple {
  background: #a895ef;
}
[data-theme='dark'] .ww-notes-color.is-gray {
  background: #98a2b3;
}
[data-theme='dark'] .ww-notes-color.is-orange {
  background: #f2a04a;
}
[data-theme='dark'] .ww-notes-color.is-teal {
  background: #3bc3ba;
}
[data-theme='dark'] .ww-notes-color.is-red {
  background: #f58884;
}

.ww-notes-editor__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.25rem 0.375rem;
  flex: 0 0 auto;
  max-width: 100%;
}

@container notes-editor (max-width: 26rem) {
  .ww-notes-colors {
    flex-basis: 100%;
    margin-right: 0;
  }

  .ww-notes-editor__actions {
    flex-basis: 100%;
    justify-content: flex-end;
  }
}

.ww-notes-editor__meta {
  margin-right: 0.25rem;
  font-size: 0.75rem;
  color: var(--ww-ink-faint);
  white-space: nowrap;
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 列表置顶 / 独立窗口 / 窗口置顶：仅激活态使用便笺主题色 */
:deep(.ww-notes-icon-btn--note-accent.ww-notes-icon-btn--on) {
  color: var(--ww-notes-accent) !important;
}

:deep(.ww-notes-icon-btn--note-accent.ww-notes-icon-btn--on:hover:not(:disabled)) {
  color: var(--ww-notes-accent) !important;
  filter: brightness(0.92);
}

.ww-notes-editor__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 1.375rem 1.625rem 1.5rem;
  gap: 0.875rem;
}

.ww-notes-editor__title,
.ww-notes-editor__content {
  width: 100%;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: var(--ww-ink);
  padding: 0.375rem 0.25rem;
  outline: none;
}

.ww-notes-editor__title:focus-visible,
.ww-notes-editor__content:focus-visible {
  box-shadow: var(--ww-focus-ring);
}

.ww-notes-editor__title {
  flex-shrink: 0;
  min-height: 2.5rem;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.ww-notes-editor__title::placeholder {
  color: var(--ww-ink-faint);
}

.ww-notes-editor__content {
  flex: 1;
  min-height: 14rem;
  font-size: 0.875rem;
  line-height: 1.68;
  overflow: auto;
}

.ww-notes-editor__content :deep(.tiptap) {
  min-height: 100%;
  outline: none;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.ww-notes-editor__content :deep(.tiptap p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  color: var(--ww-ink-faint);
  pointer-events: none;
  float: left;
  height: 0;
}

.ww-notes-editor__content :deep(.tiptap a) {
  color: var(--ww-notes-accent);
  text-decoration: underline;
  text-underline-offset: 0.12em;
  cursor: pointer;
}

.ww-notes-editor__content :deep(.ww-note-image-node) {
  position: relative;
  display: inline-block;
  vertical-align: top;
  max-width: 100%;
  margin: 0.18rem 0.18rem 0.18rem 0;
  border-radius: 0.375rem;
  overflow: hidden;
  line-height: 0;
}

.ww-notes-editor__content :deep(.ww-note-image-node.is-align-center),
.ww-notes-editor__content :deep(.ww-note-image-node.is-align-right) {
  display: block;
  width: fit-content;
  max-width: 100%;
}

.ww-notes-editor__content :deep(.ww-note-image-node.is-align-center) {
  margin-inline: auto;
}

.ww-notes-editor__content :deep(.ww-note-image-node.is-align-right) {
  margin-inline: start auto;
}

.ww-notes-editor__content :deep(.ww-note-image-node img) {
  display: block;
  width: auto;
  max-width: 100%;
  height: auto;
  border-radius: 0.375rem;
  cursor: text;
}

.ww-notes-editor__content :deep(.ww-note-image-node__remove) {
  position: absolute;
  top: 0.3rem;
  right: 0.3rem;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: rgb(14 14 18 / 0.72);
  color: #fff;
  line-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  cursor: pointer;
  transition: opacity var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-notes-editor__content :deep(.ww-note-image-node__remove .ww-icon) {
  display: block;
}

.ww-notes-editor__content :deep(.ww-note-image-node:hover .ww-note-image-node__remove),
.ww-notes-editor__content :deep(.ww-note-image-node.ProseMirror-selectednode .ww-note-image-node__remove) {
  opacity: 1;
}

.ww-notes-editor__content :deep(.ww-note-image-node.ProseMirror-selectednode img) {
  box-shadow: 0 0 0 2px color-mix(in oklab, var(--ww-notes-accent) 52%, transparent);
}

.ww-notes-editor__foot {
  display: flex;
  justify-content: flex-end;
  font-size: 0.75rem;
  color: var(--ww-ink-faint);
}

@media (prefers-reduced-motion: reduce) {
  .ww-notes-editor__content :deep(.ww-note-image-node__remove) {
    transition: none;
  }
}
</style>
