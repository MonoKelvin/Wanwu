export {
  canonicalNoteBodyContent,
  isNoteBodyEmpty,
  normalizeNotePlainText,
  noteContentPlainText
} from '@shared/notes/noteBodyContent'

import { normalizeNotePlainText } from '@shared/notes/noteBodyContent'

export interface TextMatchRange {
  start: number
  end: number
}

/** 在原文上的不区分大小写匹配区间（索引与 plain 文本一致） */
export function findMatchRange(text: string, query: string): TextMatchRange | null {
  const source = text
  const q = query.trim()
  if (!q || !source) return null

  const lower = source.toLowerCase()
  const qLower = q.toLowerCase()
  const index = lower.indexOf(qLower)
  if (index < 0) return null

  return { start: index, end: index + q.length }
}

export function findQueryMatchIndex(text: string, query: string): number {
  return findMatchRange(text, query)?.start ?? -1
}

export function noteTitleForSearch(title: string): string {
  const t = title.trim()
  return (t || '未命名便笺').toLowerCase()
}

/** 标题或正文（规范化纯文本）是否命中关键词 */
export function noteMatchesQuery(title: string, contentHtml: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const titleText = noteTitleForSearch(title)
  const plain = normalizeNotePlainText(contentHtml).toLowerCase()
  return titleText.includes(q) || plain.includes(q)
}

const SNIPPET_BODY_MAX = 72
/** 两行 line-clamp 下，尽量让匹配出现在可视区前部 */
const SNIPPET_MATCH_VISIBLE_OFFSET = 18

/**
 * 围绕首次命中构建摘要：窗口必含匹配段；匹配尽量靠前，避免 line-clamp 裁掉高亮。
 */
export function buildSearchSnippet(
  plainText: string,
  query: string,
  maxLen = SNIPPET_BODY_MAX
): string {
  const raw = plainText.trim()
  if (!raw) return '无正文'

  const q = query.trim()
  if (!q) return raw.length > maxLen ? `${raw.slice(0, maxLen)}…` : raw

  const match = findMatchRange(raw, q)
  if (!match) return raw.length > maxLen ? `${raw.slice(0, maxLen)}…` : raw

  const { start: mStart, end: mEnd } = match
  const matchLen = mEnd - mStart
  const headPad = Math.min(SNIPPET_MATCH_VISIBLE_OFFSET, Math.max(6, Math.floor((maxLen - matchLen) * 0.22)))

  let start = Math.max(0, mStart - headPad)
  let end = Math.min(raw.length, mEnd + Math.max(maxLen - headPad - matchLen, 12))

  if (end - start > maxLen) {
    end = Math.min(raw.length, start + maxLen)
  }
  if (mEnd > end) {
    end = Math.min(raw.length, mEnd + 6)
    start = Math.max(0, end - maxLen)
  }
  if (mStart < start) {
    start = Math.max(0, mStart - 6)
    end = Math.min(raw.length, Math.max(mEnd + 10, start + Math.min(maxLen, 48)))
  }

  let body = raw.slice(start, end)
  if (!body || !findMatchRange(body, q)) {
    start = Math.max(0, mStart - 10)
    end = Math.min(raw.length, mEnd + Math.min(36, maxLen))
    body = raw.slice(start, end)
  }

  const rel = findMatchRange(body, q)
  if (rel && rel.start > SNIPPET_MATCH_VISIBLE_OFFSET) {
    start = Math.max(0, mStart - 8)
    end = Math.min(raw.length, start + maxLen)
    if (mEnd > end) {
      end = Math.min(raw.length, mEnd + 6)
      start = Math.max(0, end - maxLen)
    }
    body = raw.slice(start, end)
  }

  const prefix = start > 0 ? '...' : ''
  const suffix = end < raw.length ? '...' : ''
  const snippet = `${prefix}${body}${suffix}`

  if (!findMatchRange(snippet.replace(/^\.\.\./, '').replace(/\.\.\.$/, ''), q)) {
    return `${mStart > 0 ? '...' : ''}${raw.slice(mStart, Math.min(raw.length, mEnd + 24))}${
      mEnd < raw.length ? '...' : ''
    }`
  }

  return snippet
}

export function highlightQueryHtml(text: string, query: string): string {
  const q = query.trim()
  if (!q) return escapeHtml(text)

  const lower = text.toLowerCase()
  const qLower = q.toLowerCase()
  let result = ''
  let cursor = 0

  while (cursor < text.length) {
    const hit = lower.indexOf(qLower, cursor)
    if (hit < 0) {
      result += escapeHtml(text.slice(cursor))
      break
    }
    const matchEnd = hit + q.length
    result += escapeHtml(text.slice(cursor, hit))
    result += `<mark class="ww-notes-hit">${escapeHtml(text.slice(hit, matchEnd))}</mark>`
    cursor = matchEnd
  }

  return result
}

export function escapePlainText(text: string): string {
  return escapeHtml(text)
}

export interface NoteSearchDisplay {
  titleHtml: string
  previewHtml: string
  matchedInTitle: boolean
  matchedInContent: boolean
}

export function prepareNoteSearchDisplay(
  title: string,
  contentHtml: string,
  query: string,
  previewMax = 56
): NoteSearchDisplay {
  const q = query.trim()
  const plainContent = normalizeNotePlainText(contentHtml)
  const titleText = title.trim() || '未命名便笺'

  if (!q) {
    const preview =
      plainContent.length > previewMax ? `${plainContent.slice(0, previewMax)}…` : plainContent || '无正文'
    return {
      titleHtml: escapeHtml(titleText),
      previewHtml: escapeHtml(preview || '无正文'),
      matchedInTitle: false,
      matchedInContent: false
    }
  }

  const titleMatch = findMatchRange(titleText, q)
  const contentMatch = findMatchRange(plainContent, q)
  const matchedInTitle = titleMatch !== null
  const matchedInContent = contentMatch !== null

  const titleHtml = matchedInTitle ? highlightQueryHtml(titleText, q) : escapeHtml(titleText)

  let previewHtml: string
  if (matchedInContent) {
    const snippet = buildSearchSnippet(plainContent, q)
    previewHtml = highlightQueryHtml(snippet, q)
  } else {
    const preview =
      plainContent.length > previewMax ? `${plainContent.slice(0, previewMax)}…` : plainContent || '无正文'
    previewHtml = escapeHtml(preview || '无正文')
  }

  return {
    titleHtml,
    previewHtml,
    matchedInTitle,
    matchedInContent
  }
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
