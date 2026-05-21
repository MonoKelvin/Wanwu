import { renderMarkdown } from '@shared/markdown'
import { isMediaAttribution, mediaAttributionSource } from '@shared/utils/unsplashAttribution'
import type { Item } from '@shared/types/item'
import type { MediaAttribution } from '@shared/types/unsplash'

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

function exportStyles(): string {
  return `
:root {
  color-scheme: light;
  --ink: #121214;
  --muted: #5a5a62;
  --faint: #888890;
  --border: rgb(18 18 22 / 0.08);
  --panel: #f5f5f6;
  --accent: #3a3a42;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 14px;
  line-height: 1.55;
  color: var(--ink);
  background: #fff;
}
.page {
  max-width: 68rem;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 2.5rem;
}
.main {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.75rem;
  align-items: start;
}
@media (min-width: 900px) {
  .page { padding: 1.75rem 1.75rem 3rem; }
  .main { grid-template-columns: 1.08fr 0.92fr; gap: 2.5rem; }
}
.gallery { display: flex; flex-direction: column; gap: 0.75rem; min-width: 0; }
.hero {
  width: 100%;
  max-height: 26rem;
  object-fit: cover;
  border-radius: 0.75rem;
  border: 1px solid var(--border);
  background: var(--panel);
}
.credit { margin: 0; font-size: 0.75rem; color: var(--faint); }
.credit a { color: var(--muted); text-decoration: underline; text-underline-offset: 2px; }
.thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.thumbs img {
  width: 4rem;
  height: 4rem;
  object-fit: cover;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
}
.eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--faint);
}
h1 {
  margin: 0 0 0.5rem;
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.25;
}
.lead { margin: 0; color: var(--muted); font-size: 0.9375rem; }
.tags { display: flex; flex-wrap: wrap; gap: 0.375rem; margin-top: 0.75rem; }
.tag {
  display: inline-block;
  padding: 0.2rem 0.625rem;
  border-radius: 999px;
  font-size: 0.75rem;
  background: var(--panel);
  color: var(--accent);
  border: 1px solid var(--border);
}
.section-label {
  margin: 0 0 0.625rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--faint);
}
.specs { margin: 0; }
.spec-row {
  display: grid;
  grid-template-columns: minmax(0, 0.38fr) minmax(0, 1fr);
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
}
.spec-row dt { margin: 0; color: var(--muted); font-weight: 500; }
.spec-row dd { margin: 0; color: var(--ink); }
.desc { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border); }
.prose { font-size: 0.8125rem; line-height: 1.55; color: var(--ink); }
.prose p { margin: 0 0 0.5rem; }
.prose a { color: var(--accent); text-decoration: underline; text-underline-offset: 2px; }
.prose h2 { margin: 1rem 0 0.5rem; font-size: 1rem; }
.prose h3, .prose h4 { margin: 0.875rem 0 0.375rem; font-size: 0.9375rem; }
.prose ul, .prose ol { margin: 0 0 0.5rem; padding-left: 1.25rem; }
.prose blockquote {
  margin: 0.5rem 0;
  padding: 0.5rem 0.75rem;
  border-left: 3px solid var(--border);
  color: var(--muted);
}
.prose code {
  padding: 0.1em 0.35em;
  border-radius: 0.25rem;
  background: var(--panel);
  font-size: 0.92em;
}
.prose pre {
  overflow: auto;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: var(--panel);
  border: 1px solid var(--border);
}
.footer-note {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
  font-size: 0.75rem;
  color: var(--faint);
}
`.trim()
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

  const heroSrc = (await embed(heroUrl)) ?? heroUrl
  const heroBlock = heroSrc
    ? `<img class="hero" src="${escapeHtml(heroSrc)}" alt="${escapeHtml(item.name)}" />`
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
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(item.name)} — Wanwu</title>
  <style>${exportStyles()}</style>
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
