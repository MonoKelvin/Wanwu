/**
 * 种子构建辅助：描述格式化、catalog 合并、media 兜底
 */
import { readFileSync, existsSync } from 'fs'

/** 段首「标签：」在第二段起加粗为 Markdown（跳过已加粗段落，避免 ****） */
export function formatDescription(text) {
  if (!text?.trim()) return ''
  return text
    .split('\n\n')
    .map((block, index) => {
      const trimmed = block.trim()
      if (index === 0) return trimmed
      if (/^\*\*[^*]+\*\*[：:]/.test(trimmed)) return trimmed
      const m = trimmed.match(/^(?:\*\*)?([^*：\n]{2,16})(?:\*\*)?[：:]([\s\S]*)$/)
      if (m) return `**${m[1].trim()}**：${m[2]}`
      return trimmed
    })
    .join('\n\n')
}

/** 修复历史 catalog / content 中重复的 **** 加粗 */
export function normalizeMarkdownLabels(text) {
  if (!text?.trim()) return ''
  return text
    .replace(/\*{4,}([^*]+?)\*{4,}/g, '**$1**')
    .replace(/\*{3}([^*]+?)\*{3}/g, '**$1**')
}

/** 合并已有 catalog 中的 attribution 字段（不覆盖磁盘扫描得到的 coverFile / galleryFiles） */
export function mergeExistingAttributions(nextItems, catalogPath) {
  if (!existsSync(catalogPath)) return nextItems
  try {
    const prev = JSON.parse(readFileSync(catalogPath, 'utf-8'))
    const bySlug = new Map((prev.items ?? []).map((i) => [i.slug, i]))
    return nextItems.map((entry) => {
      const old = bySlug.get(entry.slug)
      if (!old) return entry
      const merged = { ...entry }
      if (old.coverAttribution) merged.coverAttribution = old.coverAttribution
      const galleryCount = entry.galleryFiles?.length ?? 0
      if (old.galleryAttributions?.length && galleryCount > 0) {
        merged.galleryAttributions = old.galleryAttributions.slice(0, galleryCount)
      }
      return merged
    })
  } catch {
    return nextItems
  }
}

/** 为缺少 query 的条目生成兜底 media 配置 */
export function fillMissingMediaQueries(mediaItems, catalogItems, defaults) {
  for (const item of catalogItems) {
    if (mediaItems[item.slug]?.query) continue
    const tail = item.slug.replace(/^[^-]+-/, '').replace(/-/g, ' ')
    const nameWords = (item.name ?? '')
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .join(' ')
    const pet = ['cat', 'dog'].includes(item.categoryId)
    mediaItems[item.slug] = {
      provider: defaults.provider ?? 'pixabay',
      query: `${nameWords || tail} ${item.tags?.[0] ?? ''}`.trim(),
      category: pet ? 'animals' : undefined,
      requiredTags: pet ? [item.categoryId] : [],
      matchTags: [...new Set([...(item.tags ?? []).slice(0, 3), ...tail.split(' ').slice(0, 2)])].filter(
        Boolean
      )
    }
  }
  return mediaItems
}
