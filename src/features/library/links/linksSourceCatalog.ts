import type { CatalogNode } from '@library/types/catalog'
import type { LinkFolder } from '@shared/types/links'
import {
  EDGE_ROOT_FOLDER_ID,
  LINKS_RECYCLE_BIN_ID,
  LOCAL_COLLECTIONS_ROOT_ID
} from '@shared/stores/links'
import { LINK_BROWSER_SOURCES } from '@library/links/sources'

/** 全库侧栏「链接」：浏览器来源 + 收藏夹树 + 回收站 */
export function buildLinksSourceCatalog(roots: LinkFolder[]): CatalogNode[] {
  const byId = new Map(roots.map((f) => [f.id, f]))
  const nodes: CatalogNode[] = []

  for (const src of LINK_BROWSER_SOURCES) {
    const folder = byId.get(src.rootFolderId)
    if (!folder) continue
    nodes.push({
      id: folder.id,
      name: folder.name,
      icon: src.icon,
      leaf: true,
      meta: { kind: 'browser-source', source: src.id }
    })
  }

  const localRoot = byId.get(LOCAL_COLLECTIONS_ROOT_ID)
  const localChildren = localRoot?.children ?? []

  const mapLocalFolder = (f: LinkFolder): CatalogNode => ({
    id: f.id,
    name: f.name,
    icon: 'folder',
    leaf: !f.children?.length,
    children: f.children?.length ? f.children.map(mapLocalFolder) : undefined,
    meta: { kind: 'local-folder' }
  })

  nodes.push({
    id: LOCAL_COLLECTIONS_ROOT_ID,
    name: '收藏夹',
    icon: 'folder-open',
    leaf: !localChildren.length,
    children: localChildren.length ? localChildren.map(mapLocalFolder) : undefined,
    meta: { kind: 'local-root' }
  })

  const recycle = byId.get(LINKS_RECYCLE_BIN_ID)
  if (recycle) {
    nodes.push({
      id: recycle.id,
      name: recycle.name,
      icon: 'trash-2',
      leaf: true,
      meta: { kind: 'recycle-bin', isRecycleBin: true }
    })
  }

  return nodes.sort((a, b) => {
    if (a.id === LINKS_RECYCLE_BIN_ID) return 1
    if (b.id === LINKS_RECYCLE_BIN_ID) return -1
    if (a.id === LOCAL_COLLECTIONS_ROOT_ID) return 1
    if (b.id === LOCAL_COLLECTIONS_ROOT_ID) return -1
    return a.name.localeCompare(b.name, 'zh-CN')
  })
}
