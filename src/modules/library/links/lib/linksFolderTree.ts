/**
 * 链接工作区目录树工具：解析当前 folderId 所属分组，并生成 PrimeVue Tree 节点。
 */
import type { TreeNode } from 'primevue/treenode'
import { catalogToTreeNodes, type CatalogNode } from '@shared/types/catalog'
import { browserBrandIconUrl } from '@modules/library/links/domain/browserBrandIcons'
import {
  browserSourceForRootFolderId,
  isBrowserRootFolderId,
  LOCAL_COLLECTIONS_SOURCE
} from '@modules/library/links/domain/sources'
import {
  LINKS_RECYCLE_BIN_ID,
  LOCAL_COLLECTIONS_ROOT_ID
} from '@modules/library/links/domain/constants'
import type { BrowserBookmarkSourceId, LinkFolder } from '@modules/library/links/domain/types'

/** 在文件夹树中按 id 深度优先查找节点 */
export function findLinkFolder(
  folders: LinkFolder[],
  id: string
): LinkFolder | null {
  const walk = (list: LinkFolder[]): LinkFolder | null => {
    for (const f of list) {
      if (f.id === id) return f
      if (f.children?.length) {
        const hit = walk(f.children)
        if (hit) return hit
      }
    }
    return null
  }
  return walk(folders)
}

export type LinksGroupKind = 'browser' | 'local' | 'recycle'

export type LinksGroupRoot =
  | { kind: 'recycle'; root: LinkFolder }
  | { kind: 'local'; root: LinkFolder }
  | { kind: 'browser'; root: LinkFolder; browserSourceId: BrowserBookmarkSourceId }

export function resolveLinksGroupRoot(
  folders: LinkFolder[],
  folderId: string
): LinksGroupRoot | null {
  if (folderId === LINKS_RECYCLE_BIN_ID) {
    const root = findLinkFolder(folders, LINKS_RECYCLE_BIN_ID)
    return root ? { kind: 'recycle', root } : null
  }

  const localRoot = findLinkFolder(folders, LOCAL_COLLECTIONS_ROOT_ID)
  if (localRoot) {
    if (folderId === LOCAL_COLLECTIONS_ROOT_ID) {
      return { kind: 'local', root: localRoot }
    }
    const currentLocal = findLinkFolder(folders, folderId)
    if (currentLocal && isDescendantOf(folders, folderId, LOCAL_COLLECTIONS_ROOT_ID)) {
      return { kind: 'local', root: localRoot }
    }
  }

  for (const folder of folders) {
    if (!isBrowserRootFolderId(folder.id)) continue
    const def = browserSourceForRootFolderId(folder.id)
    if (!def) continue
    if (folderId === folder.id) {
      return { kind: 'browser', root: folder, browserSourceId: def.id }
    }
    if (isDescendantOf(folders, folderId, folder.id)) {
      return { kind: 'browser', root: folder, browserSourceId: def.id }
    }
  }

  const current = findLinkFolder(folders, folderId)
  if (!current) return null

  if (current.isRecycleBin || current.id === LINKS_RECYCLE_BIN_ID) {
    const root = findLinkFolder(folders, LINKS_RECYCLE_BIN_ID)
    return root ? { kind: 'recycle', root } : null
  }

  return null
}

function isDescendantOf(folders: LinkFolder[], folderId: string, ancestorId: string): boolean {
  let current = findLinkFolder(folders, folderId)
  while (current) {
    if (current.id === ancestorId) return true
    if (!current.parentId) return false
    current = findLinkFolder(folders, current.parentId)
  }
  return false
}

function foldersToCatalogNodes(folders: LinkFolder[]): CatalogNode[] {
  return folders.map((f) => ({
    id: f.id,
    name: f.name,
    icon: 'folder' as const,
    leaf: !f.children?.length,
    children: f.children?.length ? foldersToCatalogNodes(f.children) : undefined
  }))
}

/** 工作区左侧目录：浏览器来源根；本地收藏直接展示子文件夹 */
export function buildLinksWorkspaceFolderTree(group: LinksGroupRoot): TreeNode[] {
  if (group.kind === 'recycle') return []

  const childNodes = catalogToTreeNodes(
    foldersToCatalogNodes(group.root.children ?? []),
    (node) => `fld:${node.id}`
  )

  if (group.kind === 'local') {
    return [
      {
        key: `src:${LOCAL_COLLECTIONS_ROOT_ID}`,
        label: LOCAL_COLLECTIONS_SOURCE.name,
        icon: 'folder-open',
        selectable: true,
        children: childNodes.length ? childNodes : undefined
      }
    ]
  }

  const browserDef =
    group.kind === 'browser' ? browserSourceForRootFolderId(group.root.id) : undefined

  return [
    {
      key: `src:${group.root.id}`,
      label: group.root.name,
      icon: undefined,
      selectable: true,
      children: childNodes.length ? childNodes : undefined,
      data: browserDef ? { iconSrc: browserBrandIconUrl(browserDef.id) } : undefined
    }
  ]
}

export function buildGroupFolderTreeNodes(group: LinksGroupRoot): TreeNode[] {
  return buildLinksWorkspaceFolderTree(group)
}

/** 进入某文件夹时需展开的祖先节点 key（`src:` / `fld:` 前缀） */
export function ancestorExpandedKeysForFolder(
  group: LinksGroupRoot,
  folderId: string
): Record<string, boolean> {
  const keys: Record<string, boolean> = {}
  if ((group.kind === 'browser' || group.kind === 'local') && folderId !== group.root.id) {
    keys[`src:${group.root.id}`] = true
  }
  if (folderId === group.root.id) return keys

  const walk = (list: LinkFolder[], ancestors: string[]): boolean => {
    for (const f of list) {
      const next = [...ancestors, f.id]
      if (f.id === folderId) {
        for (const id of next) keys[`fld:${id}`] = true
        return true
      }
      if (f.children?.length && walk(f.children, next)) return true
    }
    return false
  }
  walk(group.root.children ?? [], [])
  return keys
}

/** 首次进入某来源时的默认展开 key（含来源根与当前路径祖先） */
export function defaultExpandedKeysForFolder(
  group: LinksGroupRoot,
  folderId: string
): Record<string, boolean> {
  const keys: Record<string, boolean> = {}
  if (group.kind === 'browser' || group.kind === 'local') {
    keys[`src:${group.root.id}`] = true
  }
  return { ...keys, ...ancestorExpandedKeysForFolder(group, folderId) }
}

export function folderIconForNode(node: TreeNode): string {
  const data = node.data as { icon?: string } | undefined
  return (node.icon as string) || data?.icon || 'folder'
}
