import type { Item } from '@shared/types/item'
import type { ShareCardContent } from './types'

const SUMMARY_MAX_CHARS = 56
const HIGHLIGHT_MAX = 3

function truncate(text: string, max: number): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

/** 从物品提取精简文案，避免画面信息过载 */
export function buildShareCardContent(item: Item): ShareCardContent {
  const highlights: string[] = []

  const specEntries = Object.entries(item.specs ?? {}).slice(0, HIGHLIGHT_MAX)
  for (const [k, v] of specEntries) {
    if (highlights.length >= HIGHLIGHT_MAX) break
    const line = truncate(`${k} · ${v}`, 22)
    if (line) highlights.push(line)
  }

  const summary = item.summary?.trim() ?? ''
  const summaryLines: string[] = []
  if (summary) {
    const first = truncate(summary, SUMMARY_MAX_CHARS)
    summaryLines.push(first)
    if (summary.length > SUMMARY_MAX_CHARS) {
      const rest = summary.slice(SUMMARY_MAX_CHARS).trim()
      if (rest) summaryLines.push(truncate(rest, SUMMARY_MAX_CHARS))
    }
  }

  return {
    title: truncate(item.name, 32),
    summaryLines: summaryLines.slice(0, 2),
    highlights: highlights.slice(0, HIGHLIGHT_MAX)
  }
}
