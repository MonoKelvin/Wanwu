import type { ShareExportFormat } from '@modules/item/utils/exportDetailHtml'
import {
  captureBackgroundColor,
  shareCaptureFixCss,
  syncThemeVarsToClone
} from '@modules/item/utils/shareExportTheme'

export type ShareImageFormat = ShareExportFormat

function injectShareCaptureFixes(doc: Document, liveRoot: HTMLElement) {
  syncThemeVarsToClone(doc)

  const capture = doc.querySelector('[data-share-capture]') as HTMLElement | null
  if (!capture) return

  capture.style.overflow = 'visible'
  capture.style.maxHeight = 'none'
  capture.style.height = 'auto'
  capture.style.boxShadow = 'none'
  capture.style.background = getComputedStyle(document.documentElement)
    .getPropertyValue('--ww-content')
    .trim()

  const style = doc.createElement('style')
  style.textContent = shareCaptureFixCss()
  doc.head.appendChild(style)

  const liveHeroImgs = liveRoot.querySelectorAll('.ww-product-detail__hero-img')
  doc.querySelectorAll('[data-share-capture] .ww-product-detail__hero-img').forEach((node, index) => {
    if (!(node instanceof HTMLImageElement)) return
    const liveImg = liveHeroImgs[index] as HTMLImageElement | undefined
    const nw = liveImg?.naturalWidth ?? node.naturalWidth
    const nh = liveImg?.naturalHeight ?? node.naturalHeight
    if (!nw || !nh) return

    const frame = node.closest('.ww-product-detail__hero-frame') as HTMLElement | null
    const liveFrame = liveImg?.closest('.ww-product-detail__hero-frame') as HTMLElement | null
    const boxW = liveFrame?.clientWidth ?? frame?.clientWidth ?? nw
    const boxH = liveFrame?.clientHeight ?? frame?.clientHeight ?? nh
    const scale = Math.min(boxW / nw, boxH / nh, 1)
    const w = Math.max(1, Math.round(nw * scale))
    const h = Math.max(1, Math.round(nh * scale))

    node.style.width = `${w}px`
    node.style.height = `${h}px`
    node.style.maxWidth = '100%'
    node.style.maxHeight = '100%'
    node.style.objectFit = 'contain'
    node.style.display = 'block'
  })
}

export async function captureDetailLongImage(
  root: HTMLElement,
  format: Exclude<ShareExportFormat, 'html'> = 'png'
): Promise<string> {
  const { default: html2canvas } = await import('html2canvas')
  const bg = captureBackgroundColor()

  const canvas = await html2canvas(root, {
    scale: Math.min(2, window.devicePixelRatio || 1.5),
    useCORS: true,
    logging: false,
    backgroundColor: bg,
    scrollX: 0,
    scrollY: 0,
    width: root.scrollWidth,
    height: root.scrollHeight,
    windowWidth: root.scrollWidth,
    windowHeight: root.scrollHeight,
    onclone: (doc) => {
      injectShareCaptureFixes(doc, root)
    }
  })

  if (format === 'jpeg') return canvas.toDataURL('image/jpeg', 0.92)
  return canvas.toDataURL('image/png')
}
