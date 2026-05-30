/** 分享导出（PNG/JPEG/HTML）与当前界面主题对齐 */

export type ShareTheme = 'light' | 'dark'

export function resolveShareTheme(): ShareTheme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

/** 从 :root / [data-theme=dark] 同步到 html2canvas 克隆文档 */
const THEME_VAR_NAMES = [
  '--ww-content',
  '--ww-inset',
  '--ww-elevated',
  '--ww-ink',
  '--ww-ink-muted',
  '--ww-ink-faint',
  '--ww-accent',
  '--ww-accent-soft',
  '--ww-tag-bg',
  '--ww-tag-fg',
  '--ww-tag-border',
  '--ww-border-subtle',
  '--ww-border-faint',
  '--ww-grid-dot',
  '--ww-grid-size',
  '--ww-list-hover-bg',
  '--ww-prose-size',
  '--ww-prose-leading',
  '--ww-md-size',
  '--ww-md-leading',
  '--ww-md-gap',
  '--ww-md-link',
  '--ww-md-link-hover',
  '--ww-md-quote-bg',
  '--ww-md-callout-bg',
  '--ww-md-callout-border',
  '--ww-md-callout-tip',
  '--ww-md-callout-note',
  '--ww-md-callout-info',
  '--ww-md-callout-warning',
  '--ww-md-callout-danger',
  '--ww-md-callout-example',
  '--ww-md-callout-quote'
]

export function syncThemeVarsToClone(doc: Document) {
  const src = document.documentElement
  const dst = doc.documentElement
  const theme = resolveShareTheme()
  dst.dataset.theme = theme
  dst.dataset.colorScheme = src.dataset.colorScheme ?? theme

  const computed = getComputedStyle(src)
  for (const name of THEME_VAR_NAMES) {
    const value = computed.getPropertyValue(name).trim()
    if (value) dst.style.setProperty(name, value)
  }
}

export function captureBackgroundColor(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--ww-content').trim()
  return v || (resolveShareTheme() === 'dark' ? '#18181b' : '#ffffff')
}

/** html2canvas 克隆 DOM 内的布局/主题修正 */
export function shareCaptureFixCss(): string {
  return `
[data-share-capture] {
  background: var(--ww-content) !important;
  color: var(--ww-ink) !important;
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
}
[data-share-capture] .ww-product-detail__hero-actions,
[data-share-capture] .ww-product-detail__thumbs-nav,
[data-share-capture] .ww-product-detail__desc-actions,
[data-share-capture] .ww-product-detail__thumb--add {
  display: none !important;
}
[data-share-capture] .ww-product-detail__hero-stage {
  background: var(--ww-inset) !important;
  border: 1px solid var(--ww-border-subtle) !important;
}
[data-share-capture] .ww-product-detail__id-outside {
  color: var(--ww-ink-faint) !important;
}
[data-share-capture] .ww-product-detail__eyebrow {
  color: var(--ww-accent) !important;
}
[data-share-capture] .ww-product-detail__hero-frame {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: transparent !important;
}
[data-share-capture] .ww-product-detail__hero-img {
  display: block !important;
  width: auto !important;
  height: auto !important;
  max-width: 100% !important;
  max-height: 100% !important;
  object-fit: contain !important;
  object-position: center center !important;
  flex-shrink: 0 !important;
}
[data-share-capture] .ww-product-detail__thumb img {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  border-radius: inherit !important;
}
[data-share-capture] .ww-product-detail__pill-tag {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-sizing: border-box !important;
  height: 1.375rem !important;
  min-height: 1.375rem !important;
  padding: 0 0.5rem !important;
  margin: 0 !important;
  border-radius: 999px !important;
  font-size: 0.6875rem !important;
  font-weight: 500 !important;
  line-height: 1.375rem !important;
  white-space: nowrap !important;
  overflow: visible !important;
  vertical-align: middle !important;
  color: var(--ww-tag-fg) !important;
  background: var(--ww-tag-bg) !important;
  border: 1px solid var(--ww-tag-border) !important;
}
[data-share-capture] .ww-product-detail__title,
[data-share-capture] .ww-product-detail__lead,
[data-share-capture] .ww-product-detail__spec-row dt,
[data-share-capture] .ww-product-detail__spec-row dd {
  color: inherit;
}
[data-share-capture] .ww-product-detail__title { color: var(--ww-ink) !important; }
[data-share-capture] .ww-product-detail__lead { color: var(--ww-ink-muted) !important; }
[data-share-capture] .ww-product-detail__specs {
  background: var(--ww-elevated) !important;
  border-color: var(--ww-border-subtle) !important;
}
[data-share-capture] .ww-product-detail__spec-row {
  border-color: var(--ww-border-faint) !important;
}
[data-share-capture] .ww-product-detail__spec-row dt { color: var(--ww-ink-muted) !important; }
[data-share-capture] .ww-product-detail__spec-row dd { color: var(--ww-ink) !important; }
[data-share-capture] .ww-product-detail__desc {
  border-color: var(--ww-border-subtle) !important;
}
[data-share-capture] .ww-section-label {
  color: var(--ww-ink-muted) !important;
}
`.trim()
}

const HTML_THEME_LIGHT = `
  color-scheme: light;
  --ink: #121214;
  --muted: #5a5a62;
  --faint: #888890;
  --border: rgb(18 18 22 / 0.08);
  --border-faint: rgb(18 18 22 / 0.05);
  --panel: #f5f5f6;
  --elevated: #ffffff;
  --accent: #3a3a42;
  --tag-bg: #e4e4e8;
  --tag-fg: #5a5a62;
  --page-bg: #ffffff;
`

const HTML_THEME_DARK = `
  color-scheme: dark;
  --ink: #f4f4f5;
  --muted: #a1a1aa;
  --faint: #71717a;
  --border: rgb(255 255 255 / 0.08);
  --border-faint: rgb(255 255 255 / 0.05);
  --panel: #101012;
  --elevated: #1f1f23;
  --accent: #e4e4e7;
  --tag-bg: #2c2c30;
  --tag-fg: #a1a1aa;
  --page-bg: #18181b;
`

export function htmlExportStyles(theme: ShareTheme): string {
  const themeBlock = theme === 'dark' ? HTML_THEME_DARK : HTML_THEME_LIGHT
  return `
:root { ${themeBlock} }
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
  font-size: 14px;
  line-height: 1.55;
  color: var(--ink);
  background: var(--page-bg);
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
.hero-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 12rem;
  max-height: 26rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border);
  background: var(--panel);
  overflow: hidden;
}
.hero {
  display: block;
  max-width: 100%;
  max-height: 26rem;
  width: auto;
  height: auto;
  object-fit: contain;
  object-position: center;
}
.credit { margin: 0; font-size: 0.75rem; color: var(--faint); }
.credit a { color: var(--muted); text-decoration: underline; text-underline-offset: 2px; }
.thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.thumbs img {
  width: 3.75rem;
  height: 3.75rem;
  object-fit: cover;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background: var(--panel);
}
.eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
}
h1 {
  margin: 0 0 0.5rem;
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.25;
  color: var(--ink);
}
.lead { margin: 0; color: var(--muted); font-size: 0.9375rem; }
.tags { display: flex; flex-wrap: wrap; gap: 0.375rem; margin-top: 0.75rem; align-items: center; }
.tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  height: 1.375rem;
  padding: 0 0.5rem;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 500;
  line-height: 1.375rem;
  white-space: nowrap;
  background: var(--tag-bg);
  color: var(--tag-fg);
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
.specs {
  margin: 0;
  border: 1px solid var(--border);
  border-radius: 0.625rem;
  overflow: hidden;
  background: var(--elevated);
}
.spec-row {
  display: grid;
  grid-template-columns: minmax(0, 0.38fr) minmax(0, 1fr);
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
  border-bottom: 1px solid var(--border-faint);
  font-size: 0.8125rem;
}
.spec-row:last-child { border-bottom: none; }
.spec-row dt { margin: 0; color: var(--muted); font-weight: 500; }
.spec-row dd { margin: 0; color: var(--ink); }
.desc { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border); }
.prose { font-size: 0.8125rem; line-height: 1.55; color: var(--ink); }
.prose p { margin: 0 0 0.5rem; }
.prose a { color: var(--muted); text-decoration: underline; text-underline-offset: 2px; }
.prose h2 { margin: 1rem 0 0.5rem; font-size: 1rem; color: var(--ink); }
.prose h3, .prose h4 { margin: 0.875rem 0 0.375rem; font-size: 0.9375rem; color: var(--ink); }
.prose ul, .prose ol { margin: 0 0 0.5rem; padding-left: 1.25rem; }
.prose blockquote {
  margin: 0.5rem 0;
  padding: 0.5rem 0.75rem;
  border-left: 3px solid var(--border);
  color: var(--muted);
  background: var(--panel);
}
.prose code {
  padding: 0.1em 0.35em;
  border-radius: 0.25rem;
  background: var(--panel);
  font-size: 0.92em;
  color: var(--ink);
}
.prose pre {
  overflow: auto;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: var(--panel);
  border: 1px solid var(--border);
  color: var(--ink);
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
