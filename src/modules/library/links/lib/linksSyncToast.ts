import type { LinksSyncResult } from '@shared/types/links'

export function formatLinksSyncDetail(result: LinksSyncResult): string {
  const parts: string[] = []
  if (result.added > 0) parts.push(`新增 ${result.added}`)
  if (result.updated > 0) parts.push(`更新 ${result.updated}`)
  if (result.removed > 0) parts.push(`已移除 ${result.removed}`)
  if (result.skippedDeleted > 0) parts.push(`保留删除 ${result.skippedDeleted}`)
  if (result.pushedToBrowser > 0) parts.push(`已写回浏览器 ${result.pushedToBrowser}`)
  return parts.length ? parts.join('，') : '与本地一致，无变更'
}

export function hasLinksSyncChanges(result: LinksSyncResult): boolean {
  return (
    result.added > 0 ||
    result.updated > 0 ||
    result.removed > 0 ||
    result.skippedDeleted > 0 ||
    result.pushedToBrowser > 0
  )
}
