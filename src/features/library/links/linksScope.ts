import { findLinkFolder } from '@features/library/links/linksFolderTree'
import type { LinkBookmark, LinkFolder } from '@shared/types/links'

/** 当前目录及其所有子文件夹 id */
export function collectFolderScopeIds(folders: LinkFolder[], rootFolderId: string): Set<string> {
  const ids = new Set<string>([rootFolderId])
  const root = findLinkFolder(folders, rootFolderId)
  if (!root) return ids

  const walk = (folder: LinkFolder) => {
    for (const child of folder.children ?? []) {
      ids.add(child.id)
      walk(child)
    }
  }
  walk(root)
  return ids
}

export function bookmarkIdsInFolderScope(
  folders: LinkFolder[],
  rootFolderId: string,
  bookmarks: LinkBookmark[]
): string[] {
  const scope = collectFolderScopeIds(folders, rootFolderId)
  return bookmarks.filter((b) => !b.deleted && scope.has(b.folderId)).map((b) => b.id)
}

export function countBookmarksInFolderScope(
  folders: LinkFolder[],
  rootFolderId: string,
  bookmarks: LinkBookmark[]
): number {
  const scope = collectFolderScopeIds(folders, rootFolderId)
  return bookmarks.filter((b) => !b.deleted && scope.has(b.folderId)).length
}

export function countChildFoldersInScope(folders: LinkFolder[], rootFolderId: string): number {
  const scope = collectFolderScopeIds(folders, rootFolderId)
  scope.delete(rootFolderId)
  return scope.size
}
