import type { RouteLocationNormalizedLoaded } from 'vue-router'
import type { TreeNode } from 'primevue/treenode'
import type { LibraryCatalogHooks } from '@app/modules/librarySubmoduleTypes'
import type { PixelFolder } from '@modules/library/pixel-art/domain/types'
import {
  PA_FILES,
  PA_HOME,
  PA_RECYCLE,
  isPixelSystemFolderId,
  LIBRARY_PIXEL_ART_FOLDER,
  LIBRARY_PIXEL_ART_HOME,
  isPixelEditorRoute
} from '@modules/library/pixel-art/domain/meta'
import { usePixelArtStore } from '@modules/library/pixel-art/services/pixelArtStore'

const CATALOG_SELECTION_KEY = 'wanwu:library:pixel-art-catalog-selection'

export function buildPixelCatalogTree(folders: PixelFolder[]): TreeNode[] {
  const systemOrder = [PA_HOME, PA_FILES, PA_RECYCLE]
  const systemNodes: TreeNode[] = []

  for (const id of systemOrder) {
    const folder = folders.find((f) => f.id === id)
    if (!folder) continue
    systemNodes.push({
      key: `pa:sys:${folder.id}`,
      label: folder.name,
      icon: folderIcon(folder.id),
      leaf: true,
      selectable: true,
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
  if (key.startsWith('pa:folder:')) return PA_FILES
  return null
}

export const pixelCatalogHooks: LibraryCatalogHooks = {
  treeKeyPrefix: 'pa:',

  folderIdFromTreeKey: pixelFolderIdFromTreeKey,

  resolveRouteFromTreeKey(key) {
    const folderId = pixelFolderIdFromTreeKey(key)
    if (!folderId || folderId === PA_HOME) {
      return { name: LIBRARY_PIXEL_ART_HOME }
    }
    return { name: LIBRARY_PIXEL_ART_FOLDER, params: { folderId } }
  },

  selectionFromRoute(route: RouteLocationNormalizedLoaded): Record<string, boolean> | null {
    if (isPixelEditorRoute(route.name, route.path)) {
      return { 'major:pixel-art': true }
    }
    const folderId = route.params.folderId as string | undefined
    const keys: Record<string, boolean> = {}
    if (folderId && isPixelSystemFolderId(folderId)) {
      keys[`pa:sys:${folderId}`] = true
      return keys
    }
    if (folderId) {
      keys[`pa:sys:${PA_FILES}`] = true
      return keys
    }
    keys[`pa:sys:${PA_HOME}`] = true
    return keys
  },

  readPersistedSelection: readPixelCatalogSelection,
  writePersistedSelection: writePixelCatalogSelection,

  defaultExpandedKeys: defaultPixelCatalogExpanded,

  catalogNodeBadge(node) {
    const folderId = pixelFolderIdFromTreeKey(String(node.key))
    if (folderId === PA_RECYCLE) return usePixelArtStore().recycleBinCount
    return undefined
  }
}
