import type { TreeNode } from 'primevue/treenode'
import { catalogToTreeNodes } from '@library/types/catalog'
import {
  EDGE_ROOT_FOLDER_ID,
  LINKS_RECYCLE_BIN_ID,
  LOCAL_COLLECTIONS_ROOT_ID
} from '@shared/stores/links'
import type { LinkFolder } from '@shared/types/links'

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

export type LinksGroupKind = 'edge' | 'local' | 'recycle'

export function resolveLinksGroupRoot(
  folders: LinkFolder[],
  folderId: string
): { kind: LinksGroupKind; root: LinkFolder } | null {
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

  const edgeRoot = findLinkFolder(folders, EDGE_ROOT_FOLDER_ID)
  if (!edgeRoot) return null
  if (folderId === EDGE_ROOT_FOLDER_ID) {
    return { kind: 'edge', root: edgeRoot }
  }

  const current = findLinkFolder(folders, folderId)
  if (!current) return null

  if (current.isRecycleBin || current.id === LINKS_RECYCLE_BIN_ID) {
    const root = findLinkFolder(folders, LINKS_RECYCLE_BIN_ID)
    return root ? { kind: 'recycle', root } : null
  }

  if (isDescendantOf(folders, folderId, EDGE_ROOT_FOLDER_ID)) {
    return { kind: 'edge', root: edgeRoot }
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

function foldersToCatalogNodes(folders: LinkFolder[]) {
  return folders.map((f) => ({
    id: f.id,
    name: f.name,
    icon: 'folder' as const,
    leaf: !f.children?.length,
    children: f.children?.length ? foldersToCatalogNodes(f.children) : undefined
  }))
}

function sourceRootIcon(kind: LinksGroupKind): string {
  if (kind === 'edge') return 'globe'
  if (kind === 'local') return 'folder-plus'
  return 'folder'
}

/** 工作区左侧目录：Edge 保留来源根；本地收藏直接展示子文件夹（无「我的收藏」分组行） */
export function buildLinksWorkspaceFolderTree(group: {
  kind: LinksGroupKind
  root: LinkFolder
}): TreeNode[] {
  if (group.kind === 'recycle') return []

  const childNodes = catalogToTreeNodes(
    foldersToCatalogNodes(group.root.children ?? []),
    (node) => `fld:${node.id}`
  )

  if (group.kind === 'local') {
    return [
      {
        key: `src:${LOCAL_COLLECTIONS_ROOT_ID}`,
        label: '收藏夹',
        icon: 'folder-open',
        selectable: true,
        children: childNodes.length ? childNodes : undefined
      }
    ]
  }

  return [
    {
      key: `src:${group.root.id}`,
      label: group.root.name,
      icon: sourceRootIcon(group.kind),
      selectable: true,
      children: childNodes.length ? childNodes : undefined
    }
  ]
}

export function buildGroupFolderTreeNodes(group: {
  kind: LinksGroupKind
  root: LinkFolder
}): TreeNode[] {
  return buildLinksWorkspaceFolderTree(group)
}

export function ancestorExpandedKeysForFolder(
  group: { kind: LinksGroupKind; root: LinkFolder },
  folderId: string
): Record<string, boolean> {
  const keys: Record<string, boolean> = {}
  if ((group.kind === 'edge' || group.kind === 'local') && folderId !== group.root.id) {
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

export function defaultExpandedKeysForFolder(
  group: { kind: LinksGroupKind; root: LinkFolder },
  folderId: string
): Record<string, boolean> {
  const keys: Record<string, boolean> = {}
  if (group.kind === 'edge' || group.kind === 'local') {
    keys[`src:${group.root.id}`] = true
  }
  return { ...keys, ...ancestorExpandedKeysForFolder(group, folderId) }
}

export function folderIconForNode(node: TreeNode): string {
  const data = node.data as { icon?: string } | undefined
  return (node.icon as string) || data?.icon || 'folder'
}
