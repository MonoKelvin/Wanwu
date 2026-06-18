export {
  canonicalNoteBodyContent,
  isNoteBodyEmpty,
  normalizeNotePlainText,
  noteContentPlainText
} from '@modules/library/notes/lib/noteBodyContent'

export {
  buildSearchSnippet,
  escapePlainText,
  findMatchRange,
  findQueryMatchIndex,
  highlightQueryHtml,
  type TextMatchRange
} from '@shared/lib/searchText'

import { normalizeNotePlainText } from '@modules/library/notes/lib/noteBodyContent'
import type { NoteItem } from '@modules/library/notes/domain/types'
import {
  buildSearchSnippet,
  escapePlainText,
  findMatchRange,
  highlightQueryHtml
} from '@shared/lib/searchText'

/** 便笺列表排序：置顶优先，置顶内保持原序，其余按更新时间倒序 */
export function sortNotesList(notes: readonly NoteItem[]): NoteItem[] {
  const order = new Map<string, number>()
  notes.forEach((note, index) => order.set(note.id, index))
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    if (a.pinned && b.pinned) {
      return (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
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
      titleHtml: escapePlainText(titleText),
      previewHtml: escapePlainText(preview || '无正文'),
      matchedInTitle: false,
      matchedInContent: false
    }
  }

  const titleMatch = findMatchRange(titleText, q)
  const contentMatch = findMatchRange(plainContent, q)
  const matchedInTitle = titleMatch !== null
  const matchedInContent = contentMatch !== null

  const titleHtml = matchedInTitle ? highlightQueryHtml(titleText, q) : escapePlainText(titleText)

  let previewHtml: string
  if (matchedInContent) {
    const snippet = buildSearchSnippet(plainContent, q)
    previewHtml = highlightQueryHtml(snippet, q)
  } else {
    const preview =
      plainContent.length > previewMax ? `${plainContent.slice(0, previewMax)}…` : plainContent || '无正文'
    previewHtml = escapePlainText(preview || '无正文')
  }

  return {
    titleHtml,
    previewHtml,
    matchedInTitle,
    matchedInContent
  }
}
