import type { TreeNode } from 'primevue/treenode'
import {
  EDGE_ROOT_FOLDER_ID,
  LINKS_RECYCLE_BIN_ID
} from '@shared/stores/links'
import type { LinkBookmark, LinkFolder } from '@shared/types/links'
import { findLinkFolder } from '@features/library/links/linksFolderTree'

export function bookmarkMatchesQuery(bookmark: LinkBookmark, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    bookmark.title.toLowerCase().includes(q) || bookmark.url.toLowerCase().includes(q)
  )
}

export function collectAncestorFolderIds(folders: LinkFolder[], folderId: string): string[] {
  const ids: string[] = []
  let current = findLinkFolder(folders, folderId)
  while (current) {
    ids.push(current.id)
    if (!current.parentId) break
    current = findLinkFolder(folders, current.parentId)
  }
  return ids
}

export function isUnderEdgeRoot(folders: LinkFolder[], folderId: string): boolean {
  if (folderId === LINKS_RECYCLE_BIN_ID) return false
  return collectAncestorFolderIds(folders, folderId).includes(EDGE_ROOT_FOLDER_ID)
}

export function matchingFolderIdsForBookmarks(
  folders: LinkFolder[],
  bookmarks: LinkBookmark[]
): Set<string> {
  const set = new Set<string>()
  for (const b of bookmarks) {
    for (const id of collectAncestorFolderIds(folders, b.folderId)) {
      set.add(id)
    }
  }
  return set
}

/** 内层收藏夹树：仅保留含匹配链接的分支 */
export function filterTreeNodesByFolderIds(
  nodes: TreeNode[],
  allowed: Set<string> | null
): TreeNode[] {
  if (!allowed) return nodes

  const walk = (list: TreeNode[]): TreeNode[] => {
    const out: TreeNode[] = []
    for (const node of list) {
      const key = String(node.key ?? '')
      const folderId = key.startsWith('fld:') ? key.slice(4) : ''
      const children = node.children?.length ? walk(node.children) : []
      if ((folderId && allowed.has(folderId)) || children.length) {
        out.push({
          ...node,
          children: children.length ? children : undefined
        })
      }
    }
    return out
  }
  return walk(nodes)
}

/** 全库侧栏「链接」来源节点（Edge / 回收站） */
export function filterLinksSourceTreeNodes(
  nodes: TreeNode[],
  folders: LinkFolder[],
  matches: LinkBookmark[]
): TreeNode[] {
  if (!matches.length) return []

  const edgeHit = matches.some((b) => !b.deleted && isUnderEdgeRoot(folders, b.folderId))
  const recycleHit = matches.some(
    (b) => b.deleted || b.folderId === LINKS_RECYCLE_BIN_ID
  )

  return nodes.filter((n) => {
    const key = String(n.key)
    if (key === `ln:${EDGE_ROOT_FOLDER_ID}`) return edgeHit
    if (key === `ln:${LINKS_RECYCLE_BIN_ID}`) return recycleHit
    return true
  })
}
