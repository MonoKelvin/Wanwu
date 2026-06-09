import type { DiagramPage } from '@shared/types/diagrams'

export function normalizePageName(name: string): string {
  return name.trim()
}

export function isDuplicatePageName(
  pages: DiagramPage[],
  name: string,
  excludePageId?: string
): boolean {
  const normalized = normalizePageName(name)
  if (!normalized) return false
  return pages.some(
    (page) => page.id !== excludePageId && normalizePageName(page.name) === normalized
  )
}

/** 在现有页名基础上生成不重复的名称 */
export function uniquePageName(
  pages: DiagramPage[],
  base: string,
  excludePageId?: string
): string {
  const root = normalizePageName(base) || '页1'
  if (!isDuplicatePageName(pages, root, excludePageId)) return root
  let index = 2
  while (isDuplicatePageName(pages, `${root} ${index}`, excludePageId)) {
    index += 1
  }
  return `${root} ${index}`
}

export type PageRenameResult = 'ok' | 'not_found' | 'empty' | 'duplicate'

export function validatePageRename(
  pages: DiagramPage[],
  pageId: string,
  name: string
): PageRenameResult {
  const page = pages.find((p) => p.id === pageId)
  if (!page) return 'not_found'
  const normalized = normalizePageName(name)
  if (!normalized) return 'empty'
  if (normalizePageName(page.name) === normalized) return 'ok'
  if (isDuplicatePageName(pages, normalized, pageId)) return 'duplicate'
  return 'ok'
}
