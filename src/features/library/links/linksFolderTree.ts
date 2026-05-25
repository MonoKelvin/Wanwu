import type { TreeNode } from 'primevue/treenode'
import { catalogToTreeNodes } from '@library/types/catalog'
import {
  EDGE_ROOT_FOLDER_ID,
  LINKS_RECYCLE_BIN_ID
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

export function resolveLinksGroupRoot(
  folders: LinkFolder[],
  folderId: string
): { kind: 'edge' | 'recycle'; root: LinkFolder } | null {
  if (folderId === LINKS_RECYCLE_BIN_ID) {
    const root = findLinkFolder(folders, LINKS_RECYCLE_BIN_ID)
    return root ? { kind: 'recycle', root } : null
  }
  const edgeRoot = findLinkFolder(folders, EDGE_ROOT_FOLDER_ID)
  if (!edgeRoot) return null
  if (folderId === EDGE_ROOT_FOLDER_ID) {
    return { kind: 'edge', root: edgeRoot }
  }
  const current = findLinkFolder(folders, folderId)
  if (!current) return null
  let node: LinkFolder = current
  while (node.parentId && node.parentId !== EDGE_ROOT_FOLDER_ID) {
    const parent = findLinkFolder(folders, node.parentId)
    if (!parent) break
    node = parent
  }
  if (node.isRecycleBin || node.id === LINKS_RECYCLE_BIN_ID) {
    const root = findLinkFolder(folders, LINKS_RECYCLE_BIN_ID)
    return root ? { kind: 'recycle', root } : null
  }
  return { kind: 'edge', root: edgeRoot }
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

/** 当前分组下的子目录树（不含 Edge / 回收站根节点） */
export function buildGroupFolderTreeNodes(group: {
  kind: 'edge' | 'recycle'
  root: LinkFolder
}): TreeNode[] {
  if (group.kind === 'recycle') {
    return []
  }
  const children = group.root.children ?? []
  return catalogToTreeNodes(foldersToCatalogNodes(children), (node) => `fld:${node.id}`)
}

export function folderIconForNode(node: TreeNode): string {
  const data = node.data as { icon?: string } | undefined
  return (node.icon as string) || data?.icon || 'folder'
}
