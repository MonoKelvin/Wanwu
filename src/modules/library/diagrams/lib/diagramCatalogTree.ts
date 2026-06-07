import type { TreeNode } from 'primevue/treenode'
import type { DiagramFolder } from '@shared/types/diagrams'
import {
  DG_FILES,
  DG_HOME,
  DG_RECYCLE,
  isDiagramCustomFolderId
} from '@modules/library/diagrams/domain/diagramFolderIds'

const CATALOG_SELECTION_KEY = 'wanwu:library:diagrams-catalog-selection'

export function buildDiagramCatalogTree(folders: DiagramFolder[]): TreeNode[] {
  const systemOrder = [DG_HOME, DG_FILES, DG_RECYCLE]
  const systemNodes: TreeNode[] = []
  for (const id of systemOrder) {
    const folder = folders.find((f) => f.id === id)
    if (!folder) continue
    systemNodes.push({
      key: `dg:sys:${folder.id}`,
      label: folder.name,
      icon: folderIcon(folder.id),
      leaf: true,
      selectable: true,
      data: { kind: 'system-folder', folderId: folder.id }
    })
  }

  const custom = folders
    .filter((f) => isDiagramCustomFolderId(f.id))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(
      (f): TreeNode => ({
        key: `dg:folder:${f.id}`,
        label: f.name,
        icon: 'folder',
        leaf: true,
        selectable: true,
        data: { kind: 'custom-folder', folderId: f.id }
      })
    )

  return [...systemNodes, ...custom]
}

function folderIcon(id: string): string {
  if (id === DG_HOME) return 'home'
  if (id === DG_RECYCLE) return 'trash-2'
  return 'folder'
}

export function readDiagramCatalogSelection(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(CATALOG_SELECTION_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, boolean>
  } catch {
    return {}
  }
}

export function writeDiagramCatalogSelection(keys: Record<string, boolean>): void {
  localStorage.setItem(CATALOG_SELECTION_KEY, JSON.stringify(keys))
}

/** 进入流程图大分类时默认展开主节点 */
export function defaultDiagramsCatalogExpanded(): Record<string, boolean> {
  return { 'major:diagrams': true }
}

export function diagramFolderIdFromTreeKey(key: string): string | null {
  if (key.startsWith('dg:sys:')) return key.slice('dg:sys:'.length)
  if (key.startsWith('dg:folder:')) return key.slice('dg:folder:'.length)
  return null
}
