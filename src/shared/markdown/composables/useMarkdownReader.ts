import { computed, nextTick, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import type { WwMenuItem } from '@shared/types/menu'
import type { ImageViewerSlide } from '@shared/types/image-viewer'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import { POP_TIP_COPY_MESSAGES, usePopTip } from '@shared/composables/usePopTip'
import { renderMarkdown } from '../utils/renderMarkdown'
import { resolveImageViewerUrl } from '../utils/imageViewerUrl'
import { enhanceMarkdownDom, type MarkdownImageMenuHandlers } from './enhanceMarkdownDom'

export type UseMarkdownReaderOptions = {
  /** 图片右键菜单、点击查看大图 */
  interactive?: boolean
  /** 图片右键时弹出菜单（由组件传入 WwContextMenu.show） */
  onImageContextMenu?: (event: MouseEvent, img: HTMLImageElement) => void
}

export function useMarkdownReader(
  content: Ref<string>,
  options: UseMarkdownReaderOptions = {}
) {
  const interactive = options.interactive !== false
  const toast = useWanwuToast()
  const popTip = usePopTip()

  const rootRef = ref<HTMLElement | null>(null)
  const menuTargetImg = ref<HTMLImageElement | null>(null)

  const lightboxOpen = ref(false)
  const lightboxSlides = ref<ImageViewerSlide[]>([])
  const lightboxRevoke = ref<(() => void) | null>(null)
  const lightboxLoading = ref(false)

  const html = computed(() => renderMarkdown(content.value))

  let disposeEnhance: (() => void) | undefined

  function releaseLightboxResources() {
    lightboxRevoke.value?.()
    lightboxRevoke.value = null
  }

  async function openImageLightbox(url: string) {
    if (!url || lightboxLoading.value) return
    releaseLightboxResources()
    lightboxLoading.value = true
    try {
      const { url: displayUrl, revoke } = await resolveImageViewerUrl(url)
      lightboxRevoke.value = revoke ?? null
      lightboxSlides.value = [{ url: displayUrl, alt: '' }]
      lightboxOpen.value = true
    } catch {
      toast.error('无法打开大图')
    } finally {
      lightboxLoading.value = false
    }
  }

  async function saveImageAs(url: string) {
    if (!url) return
    const ext = /\.png/i.test(url) ? 'png' : /\.webp/i.test(url) ? 'webp' : 'jpg'
    const result = await window.wanwu.shell.downloadFile({ url, defaultName: `image.${ext}` })
    if (result.ok && result.path) {
      toast.success('图片已保存', undefined, { action: toast.revealInFolderAction(result.path) })
    } else if (!result.canceled) {
      toast.error(result.error ?? '保存失败')
    }
  }

  async function openImageInBrowser(url: string) {
    if (!url) return
    await window.wanwu.shell.openExternal(url)
  }

  async function copyImageLink(url: string) {
    if (!url) return
    await popTip.copyText(url, POP_TIP_COPY_MESSAGES.imageLink)
  }

  const imageMenuItems = computed((): WwMenuItem[] => {
    const src = menuTargetImg.value?.getAttribute('src') ?? ''
    return [
      { label: '另存为', wwIcon: 'download', command: () => void saveImageAs(src) },
      { label: '在浏览器打开', wwIcon: 'external-link', command: () => void openImageInBrowser(src) },
      { label: '复制图片链接', wwIcon: 'copy', command: () => void copyImageLink(src) },
      { label: '查看大图', wwIcon: 'maximize', command: () => openImageLightbox(src) }
    ]
  })

  const imageMenuHandlers: MarkdownImageMenuHandlers = {
    onContextMenu(event, img) {
      menuTargetImg.value = img
      options.onImageContextMenu?.(event, img)
    }
  }

  function runEnhance() {
    disposeEnhance?.()
    if (!interactive) {
      disposeEnhance = enhanceMarkdownDom(rootRef.value)
      return
    }
    disposeEnhance = enhanceMarkdownDom(rootRef.value, imageMenuHandlers)
  }

  function bindRoot(el: HTMLElement | null) {
    rootRef.value = el
    void nextTick(() => runEnhance())
  }

  watch(html, async () => {
    await nextTick()
    runEnhance()
  })

  watch(lightboxOpen, (open) => {
    if (!open) {
      releaseLightboxResources()
      lightboxSlides.value = []
    }
  })

  onBeforeUnmount(() => {
    disposeEnhance?.()
    releaseLightboxResources()
  })

  async function onContentClick(event: MouseEvent) {
    if (!interactive) return
    const target = event.target
    if (!(target instanceof HTMLElement)) return

    const img = target.closest('.ww-md-img-frame img')
    if (img instanceof HTMLImageElement && rootRef.value?.contains(img)) {
      if (img.closest('.ww-md-img-frame--error')) return
      const src = img.getAttribute('src')
      if (src) await openImageLightbox(src)
      return
    }

    const anchor = target.closest('a')
    if (!anchor || !rootRef.value?.contains(anchor)) return
    const href = anchor.getAttribute('href')
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return
    event.preventDefault()
    event.stopPropagation()
    await window.wanwu.shell.openExternal(href)
  }

  return {
    html,
    rootRef,
    bindRoot,
    onContentClick,
    imageMenuItems,
    menuTargetImg,
    lightboxOpen,
    lightboxSlides,
    interactive
  }
}
