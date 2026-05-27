import { renderMarkdown } from '@shared/markdown'
import { isMediaAttribution, mediaAttributionSource } from '@shared/utils/unsplashAttribution'
import type { Item } from '@shared/types/item'
import type { MediaAttribution } from '@shared/types/unsplash'
import { htmlExportStyles, resolveShareTheme } from '@modules/item/utils/shareExportTheme'

export type ShareExportFormat = 'png' | 'jpeg' | 'html'

export interface DetailGallerySlide {
  url: string
  attribution: MediaAttribution | null
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function imageUrlToDataUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(null)
          return
        }
        ctx.drawImage(img, 0, 0)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
        resolve(dataUrl)
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function attributionHtml(attribution: MediaAttribution | null): string {
  if (!isMediaAttribution(attribution)) return ''
  const brand = mediaAttributionSource(attribution) === 'pixabay' ? 'Pixabay' : 'Unsplash'
  const photographer = escapeHtml(attribution.photographerName)
  const profile = escapeHtml(attribution.photographerProfileUrl)
  const page = escapeHtml(attribution.photoPageUrl)
  return `<p class="credit">Photo by <a href="${profile}" target="_blank" rel="noopener noreferrer">${photographer}</a> on <a href="${page}" target="_blank" rel="noopener noreferrer">${brand}</a></p>`
}

function exportStyles(theme: ReturnType<typeof resolveShareTheme>): string {
  return htmlExportStyles(theme)
}

export async function buildDetailShareHtml(options: {
  item: Item
  gallery: DetailGallerySlide[]
  heroUrl: string | null
  heroAttribution: MediaAttribution | null
}): Promise<string> {
  const { item, gallery, heroUrl, heroAttribution } = options
  const imageCache = new Map<string, string>()

  async function embed(url: string | null | undefined): Promise<string | null> {
    if (!url) return null
    if (imageCache.has(url)) return imageCache.get(url)!
    const dataUrl = await imageUrlToDataUrl(url)
    if (dataUrl) imageCache.set(url, dataUrl)
    return dataUrl
  }

  const theme = resolveShareTheme()
  const heroSrc = (await embed(heroUrl)) ?? heroUrl
  const heroBlock = heroSrc
    ? `<div class="hero-wrap"><img class="hero" src="${escapeHtml(heroSrc)}" alt="${escapeHtml(item.name)}" /></div>`
    : ''

  const thumbBlocks: string[] = []
  for (const slide of gallery) {
    if (slide.url === heroUrl) continue
    const src = (await embed(slide.url)) ?? slide.url
    thumbBlocks.push(`<img src="${escapeHtml(src)}" alt="" />`)
  }
  const thumbsHtml =
    thumbBlocks.length > 0 ? `<div class="thumbs">${thumbBlocks.join('')}</div>` : ''

  const tagsHtml = item.tags?.length
    ? `<div class="tags">${item.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>`
    : ''

  const specEntries = Object.entries(item.specs ?? {})
  const specsHtml =
    specEntries.length > 0
      ? `<div class="spec-block"><h2 class="section-label">规格参数</h2><dl class="specs">${specEntries
          .map(
            ([k, v]) =>
              `<div class="spec-row"><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`
          )
          .join('')}</dl></div>`
      : ''

  const descHtml = item.description?.trim()
    ? `<section class="desc"><h2 class="section-label">详细介绍</h2><div class="prose">${renderMarkdown(item.description)}</div></section>`
    : ''

  const eyebrow = item.subCategoryName
    ? `<p class="eyebrow">${escapeHtml(item.subCategoryName)}</p>`
    : ''
  const summary = item.summary ? `<p class="lead">${escapeHtml(item.summary)}</p>` : ''

  return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="${theme}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(item.name)} — Wanwu</title>
  <style>${exportStyles(theme)}</style>
</head>
<body>
  <div class="page">
    <div class="main">
      <section class="gallery">
        ${heroBlock}
        ${attributionHtml(heroAttribution)}
        ${thumbsHtml}
      </section>
      <section class="info">
        ${eyebrow}
        <h1>${escapeHtml(item.name)}</h1>
        ${summary}
        ${tagsHtml}
        ${specsHtml}
      </section>
    </div>
    ${descHtml}
    <p class="footer-note">由 Wanwu 导出 · ${escapeHtml(new Date().toLocaleString('zh-CN'))}</p>
  </div>
</body>
</html>`
}
