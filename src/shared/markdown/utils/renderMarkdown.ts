import { marked } from 'marked'
import { cleanBlockquoteInnerHtml } from './blockquoteMarkers'

marked.setOptions({
  gfm: true,
  breaks: false
})

const CALLOUT_LINE = /^\[!([a-z][a-z0-9_-]*)\]\s*(.*)$/i

const CALLOUT_LABELS: Record<string, string> = {
  tip: '提示',
  note: '注记',
  info: '信息',
  warning: '注意',
  warn: '注意',
  danger: '危险',
  error: '错误',
  example: '示例',
  quote: '引用',
  abstract: '摘要',
  question: '问题',
  success: '成功',
  failure: '失败',
  bug: '缺陷',
  important: '重要'
}

function stripYamlFrontmatter(source: string): string {
  if (!/^---\r?\n/.test(source)) return source
  const m = source.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/)
  return m ? source.slice(m[0].length).trimStart() : source
}

/** 移除引用块内独占一段或末段末尾的 Markdown 引用符 `>` */
function removeQuoteMarkerArtifacts(html: string): string {
  const clean = (inner: string) => cleanBlockquoteInnerHtml(inner)

  let out = html.replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, (_, inner) => {
    const cleaned = clean(inner)
    return cleaned ? `<blockquote>${cleaned}</blockquote>` : '<blockquote></blockquote>'
  })

  out = out.replace(/<div class="ww-md-callout__body">([\s\S]*?)<\/div>/gi, (_, inner) => {
    const cleaned = clean(inner)
    return `<div class="ww-md-callout__body">${cleaned}</div>`
  })

  return out
}

/** 图片下一行仅斜体（em/i）→ 图注段落 */
function tagImageCaptions(html: string): string {
  return html.replace(
    /(<p>\s*<img[^>]*>\s*<\/p>)\s*(<p>\s*<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>\s*<\/p>)/gi,
    '$1<p class="ww-md-caption"><em>$3</em></p>'
  )
}

/** Obsidian 式 > [!type] 标题 → 带样式的 aside */
function enhanceObsidianCallouts(html: string): string {
  return html.replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, (full, inner) => {
    const firstP = inner.match(/<p>([\s\S]*?)<\/p>/i)
    if (!firstP) return full

    const lines = firstP[1].split('\n')
    const callout = (lines[0] ?? '').match(CALLOUT_LINE)
    if (!callout) return full

    const type = callout[1].toLowerCase()
    const title = callout[2].trim()
    const badge = CALLOUT_LABELS[type] ?? type
    const bodyParts: string[] = []

    const restOfFirst = lines.slice(1).join('\n').trim()
    if (restOfFirst) bodyParts.push(`<p>${restOfFirst}</p>`)

    const afterFirstP = inner.slice(firstP[0].length).trim()
    if (afterFirstP) bodyParts.push(afterFirstP)

    const titleHtml = title ? `<div class="ww-md-callout__title">${title}</div>` : ''
    const body = bodyParts.join('\n')

    return (
      `<aside class="ww-md-callout ww-md-callout--${type}" role="note">` +
      `<span class="ww-md-callout__badge">${badge}</span>` +
      titleHtml +
      `<div class="ww-md-callout__body">${body}</div>` +
      `</aside>`
    )
  })
}

/** Markdown 源码 → 阅读器 HTML（不含 DOM 增强，增强由 enhanceMarkdownDom 完成） */
export function renderMarkdown(source: string): string {
  const text = stripYamlFrontmatter(source?.trim() ?? '')
  if (!text) return ''
  let html = marked.parse(text, { async: false }) as string
  html = removeQuoteMarkerArtifacts(html)
  html = enhanceObsidianCallouts(html)
  html = removeQuoteMarkerArtifacts(html)
  html = tagImageCaptions(html)
  return html.replace(
    /<a href="(https?:\/\/[^"]+)"/g,
    '<a class="ww-md-external-link" href="$1" rel="noopener noreferrer"'
  )
}
