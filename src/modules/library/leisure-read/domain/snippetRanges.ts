import type { LeisureReadSnippetRange } from '@modules/library/leisure-read/domain/types'

export type { LeisureReadSnippetRange }

export function findSnippetRange(articleText: string, snippet: string): LeisureReadSnippetRange | null {
  const trimmed = snippet.trim()
  if (!trimmed) return null
  const start = articleText.indexOf(trimmed)
  if (start < 0) return null
  return { start, end: start + trimmed.length, text: trimmed }
}

export function mergeSnippetRanges(ranges: LeisureReadSnippetRange[]): LeisureReadSnippetRange[] {
  const normalized = ranges
    .filter((range) => range.end > range.start)
    .map((range) => ({
      start: Math.max(0, range.start),
      end: Math.max(range.start, range.end),
      text: range.text
    }))
    .sort((a, b) => a.start - b.start || a.end - b.end)

  const merged: LeisureReadSnippetRange[] = []
  for (const range of normalized) {
    const last = merged[merged.length - 1]
    if (!last || range.start > last.end) {
      merged.push({ ...range })
      continue
    }
    last.end = Math.max(last.end, range.end)
    if (!last.text && range.text) last.text = range.text
  }
  return merged
}

export function parseSnippetRangesJson(raw: string | null | undefined): LeisureReadSnippetRange[] {
  if (!raw?.trim()) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []

    const ranges: LeisureReadSnippetRange[] = []
    for (const item of parsed) {
      if (typeof item === 'string' && item.trim()) {
        ranges.push({ start: -1, end: -1, text: item.trim() })
        continue
      }
      if (item && typeof item === 'object') {
        const row = item as { start?: unknown; end?: unknown; text?: unknown }
        const start = Number(row.start)
        const end = Number(row.end)
        const text = typeof row.text === 'string' ? row.text : undefined
        if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
          ranges.push({ start, end, text: text?.trim() || undefined })
        } else if (text?.trim()) {
          ranges.push({ start: -1, end: -1, text: text.trim() })
        }
      }
    }
    return ranges
  } catch {
    return []
  }
}

export function resolveSnippetRanges(
  articleText: string,
  raw: string | null | undefined
): LeisureReadSnippetRange[] {
  const parsed = parseSnippetRangesJson(raw)
  const resolved = parsed
    .map((range) => {
      if (range.start >= 0 && range.end > range.start) return range
      if (!range.text) return null
      return findSnippetRange(articleText, range.text)
    })
    .filter((range): range is LeisureReadSnippetRange => Boolean(range))

  return mergeSnippetRanges(resolved)
}

export function mergeIncomingSnippetRange(
  existing: LeisureReadSnippetRange[],
  incoming: LeisureReadSnippetRange
): LeisureReadSnippetRange[] {
  return mergeSnippetRanges([...existing, incoming])
}

/** 从已有高亮中减去选区（用于取消片段收藏） */
export function subtractRangeFromRanges(
  ranges: LeisureReadSnippetRange[],
  articleText: string,
  cutStart: number,
  cutEnd: number
): LeisureReadSnippetRange[] {
  if (cutEnd <= cutStart) return mergeSnippetRanges(ranges)

  const result: LeisureReadSnippetRange[] = []
  for (const range of mergeSnippetRanges(ranges)) {
    if (range.end <= cutStart || range.start >= cutEnd) {
      result.push({ ...range })
      continue
    }
    if (range.start < cutStart) {
      result.push({
        start: range.start,
        end: cutStart,
        text: articleText.slice(range.start, cutStart)
      })
    }
    if (range.end > cutEnd) {
      result.push({
        start: cutEnd,
        end: range.end,
        text: articleText.slice(cutEnd, range.end)
      })
    }
  }
  return mergeSnippetRanges(result)
}

export function rangesOverlap(
  ranges: LeisureReadSnippetRange[],
  start: number,
  end: number
): boolean {
  if (end <= start) return false
  return ranges.some((range) => range.end > start && range.start < end)
}

export function serializeSnippetRanges(ranges: LeisureReadSnippetRange[]): string {
  return JSON.stringify(
    mergeSnippetRanges(ranges).map((range) => ({
      start: range.start,
      end: range.end,
      text: range.text ?? ''
    }))
  )
}

export function splitParagraphOffsets(text: string) {
  const parts = text.split(/\n\n+/).filter(Boolean)
  let cursor = 0
  return parts.map((para) => {
    const start = text.indexOf(para, cursor)
    const end = start + para.length
    cursor = end
    return { para, start, end }
  })
}

export function renderTextWithRanges(
  text: string,
  sliceStart: number,
  ranges: LeisureReadSnippetRange[]
) {
  const sliceEnd = sliceStart + text.length
  const localRanges = mergeSnippetRanges(
    ranges
      .filter((range) => range.end > sliceStart && range.start < sliceEnd)
      .map((range) => ({
        start: Math.max(0, range.start - sliceStart),
        end: Math.min(text.length, range.end - sliceStart),
        text: range.text
      }))
  )

  if (!localRanges.length) {
    return escapeHtml(text)
  }

  let html = ''
  let cursor = 0
  for (const range of localRanges) {
    html += escapeHtml(text.slice(cursor, range.start))
    const globalStart = sliceStart + range.start
    const globalEnd = sliceStart + range.end
    html += `<mark class="lr-article__mark" data-range-start="${globalStart}" data-range-end="${globalEnd}">${escapeHtml(text.slice(range.start, range.end))}</mark>`
    cursor = range.end
  }
  html += escapeHtml(text.slice(cursor))
  return html
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
