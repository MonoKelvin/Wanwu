/** 引用块末尾残留的 Markdown 引用符 `>`（含全角、实体） */
const LONE_MARKER_TEXT = /^(?:>|＞|&gt;)$/u
const TRAILING_MARKER_TEXT = /[\s\u00a0]*(?:>|＞)\s*$/u

const LONE_MARKER_P_HTML =
  /<p>(?:\s|&nbsp;|<br\s*\/?>)*(?:&gt;|>)(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi

/** 段落 HTML 末尾的 <br>、空白与单独引用符 */
function stripTrailingMarkerFromParagraphHtml(pTag: string): string {
  const m = pTag.match(/^<p>([\s\S]*)<\/p>$/i)
  if (!m) return pTag
  let body = m[1]
  let prev = ''
  while (prev !== body) {
    prev = body
    body = body.replace(/(?:\s|&nbsp;|<br\s*\/?>)*(?:&gt;|>)\s*$/gi, '')
  }
  body = body.trim()
  if (!body) return ''
  return `<p>${body}</p>`
}

/** 清理 blockquote 内 HTML：去掉独占一段的 `>`，并去掉末段末尾残留引用符 */
export function cleanBlockquoteInnerHtml(inner: string): string {
  let cleaned = inner.replace(LONE_MARKER_P_HTML, '')
  const lastMatch = cleaned.match(/<p>[\s\S]*?<\/p>\s*$/i)
  if (lastMatch) {
    const fixed = stripTrailingMarkerFromParagraphHtml(lastMatch[0].trim())
    cleaned = fixed
      ? cleaned.slice(0, cleaned.length - lastMatch[0].length) + fixed
      : cleaned.slice(0, cleaned.length - lastMatch[0].length)
  }
  return cleaned.replace(/(?:\s*<p>\s*<\/p>)+$/gi, '').trim()
}

function trimTrailingMarkerFromParagraphEl(p: HTMLElement) {
  while (p.lastChild) {
    const last = p.lastChild
    if (last.nodeType === Node.TEXT_NODE) {
      const t = last.textContent ?? ''
      const next = t.replace(TRAILING_MARKER_TEXT, '')
      if (next !== t) {
        if (next) last.textContent = next
        else p.removeChild(last)
        continue
      }
      break
    }
    if (last.nodeType === Node.ELEMENT_NODE && (last as Element).tagName === 'BR') {
      p.removeChild(last)
      continue
    }
    break
  }
  if (!(p.textContent?.trim() ?? '')) p.remove()
}

/** 渲染后 DOM 再清一遍（应对 v-html 与 marked 边缘结构） */
export function stripBlockquoteMarkerNodes(root: ParentNode) {
  root.querySelectorAll('blockquote, .ww-md-callout__body').forEach((block) => {
    block.querySelectorAll('p').forEach((p) => {
      const text = p.textContent?.trim() ?? ''
      if (LONE_MARKER_TEXT.test(text)) p.remove()
    })
    const paragraphs = block.querySelectorAll('p')
    const last = paragraphs[paragraphs.length - 1] as HTMLElement | undefined
    if (last) trimTrailingMarkerFromParagraphEl(last)
  })
}
