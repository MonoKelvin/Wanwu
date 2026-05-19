import type { Item } from '@shared/types/item'

/** 复制用：名称、标签、规格、详细介绍（不含 ID） */
export function buildItemCopyText(item: Item): string {
  const lines: string[] = [item.name]

  if (item.summary?.trim()) {
    lines.push('', item.summary.trim())
  }

  if (item.tags?.length) {
    lines.push('', `标签：${item.tags.join('、')}`)
  }

  const specs = item.specs ?? {}
  const specKeys = Object.keys(specs)
  if (specKeys.length) {
    lines.push('', '规格参数')
    for (const key of specKeys) {
      lines.push(`${key}：${specs[key]}`)
    }
  }

  if (item.description?.trim()) {
    lines.push('', '详细介绍', item.description.trim())
  }

  return lines.join('\n')
}

/** 社交平台分享用短文案 */
export function buildItemShareText(item: Item): string {
  const lines = [item.name]
  if (item.summary) lines.push(item.summary)
  lines.push('— 来自 Wanwu')
  return lines.join('\n')
}
