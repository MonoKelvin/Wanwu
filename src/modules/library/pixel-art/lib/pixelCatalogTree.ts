import type { TreeNode } from 'primevue/treenode'
import type { PixelFolder } from '@modules/library/pixel-art/domain/types'
import {
  PA_FILES,
  PA_HOME,
  PA_RECYCLE,
  isPixelCustomFolderId
} from '@modules/library/pixel-art/domain/folderIds'

const CATALOG_SELECTION_KEY = 'wanwu:library:pixel-art-catalog-selection'

export function listPixelChildFolders(folders: PixelFolder[], parentId: string): PixelFolder[] {
  return folders
    .filter(
      (f) =>
        isPixelCustomFolderId(f.id) &&
        !f.deletedAt &&
        (f.parentId === parentId || (parentId === PA_FILES && f.parentId == null))
    )
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'zh-CN'))
}

function buildCustomFolderNodes(folders: PixelFolder[]): TreeNode[] {
  return listPixelChildFolders(folders, PA_FILES).map(
    (f): TreeNode => ({
      key: `pa:folder:${f.id}`,
      label: f.name,
      icon: 'folder',
      leaf: true,
      selectable: true,
      data: { kind: 'custom-folder', folderId: f.id }
    })
  )
}

export function buildPixelCatalogTree(folders: PixelFolder[]): TreeNode[] {
  const systemOrder = [PA_HOME, PA_FILES, PA_RECYCLE]
  const customNodes = buildCustomFolderNodes(folders)
  const systemNodes: TreeNode[] = []

  for (const id of systemOrder) {
    const folder = folders.find((f) => f.id === id)
    if (!folder) continue
    const isFiles = id === PA_FILES
    systemNodes.push({
      key: `pa:sys:${folder.id}`,
      label: folder.name,
      icon: folderIcon(folder.id),
      leaf: isFiles ? customNodes.length === 0 : true,
      selectable: true,
      children: isFiles && customNodes.length ? customNodes : undefined,
      data: { kind: 'system-folder', folderId: folder.id }
    })
  }

  return systemNodes
}

function folderIcon(id: string): string {
  if (id === PA_HOME) return 'home'
  if (id === PA_RECYCLE) return 'trash-2'
  return 'folder'
}

export function readPixelCatalogSelection(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(CATALOG_SELECTION_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, boolean>
  } catch {
    return {}
  }
}

export function writePixelCatalogSelection(keys: Record<string, boolean>): void {
  localStorage.setItem(CATALOG_SELECTION_KEY, JSON.stringify(keys))
}

export function defaultPixelCatalogExpanded(): Record<string, boolean> {
  return { 'major:pixel-art': true }
}

export function pixelFolderIdFromTreeKey(key: string): string | null {
  if (key.startsWith('pa:sys:')) return key.slice('pa:sys:'.length)
  if (key.startsWith('pa:folder:')) return key.slice('pa:folder:'.length)
  return null
}
