import html2canvas from 'html2canvas'
import type { ShareExportFormat } from '@features/item/utils/exportDetailHtml'

export type ShareImageFormat = ShareExportFormat

const SHARE_CAPTURE_FIX_CSS = `
[data-share-capture] {
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
}
[data-share-capture] .ww-product-detail__pill-tag {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-sizing: border-box !important;
  height: 1.375rem !important;
  padding: 0 0.5rem !important;
  line-height: 1 !important;
  vertical-align: middle !important;
}
`

function injectShareCaptureFixes(doc: Document) {
  const el = doc.querySelector('[data-share-capture]') as HTMLElement | null
  if (!el) return

  el.style.overflow = 'visible'
  el.style.maxHeight = 'none'
  el.style.height = 'auto'
  el.style.boxShadow = 'none'

  const style = doc.createElement('style')
  style.textContent = SHARE_CAPTURE_FIX_CSS
  doc.head.appendChild(style)
}

export async function captureDetailLongImage(
  root: HTMLElement,
  format: Exclude<ShareExportFormat, 'html'> = 'png'
): Promise<string> {
  const canvas = await html2canvas(root, {
    scale: Math.min(2, window.devicePixelRatio || 1.5),
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    scrollX: 0,
    scrollY: -window.scrollY,
    windowWidth: root.scrollWidth,
    windowHeight: root.scrollHeight,
    onclone: (doc) => {
      injectShareCaptureFixes(doc)
    }
  })

  if (format === 'jpeg') return canvas.toDataURL('image/jpeg', 0.92)
  return canvas.toDataURL('image/png')
}
