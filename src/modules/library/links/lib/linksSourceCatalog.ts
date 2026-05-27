import type { CatalogNode } from '@modules/library/core/types/catalog'
import type { LinkFolder } from '@shared/types/links'
import {
  LINKS_RECYCLE_BIN_ID,
  LOCAL_COLLECTIONS_ROOT_ID
} from '@shared/stores/links'
import { browserBrandIconUrl } from '@modules/library/links/domain/browserBrandIcons'
import { LINK_BROWSER_SOURCES } from '@modules/library/links/domain/sources'

/** 全库侧栏「链接」：仅顶级来源（浏览器 / 收藏夹 / 回收站），不展开子文件夹 */
export function buildLinksSourceCatalog(roots: LinkFolder[]): CatalogNode[] {
  const byId = new Map(roots.map((f) => [f.id, f]))
  const nodes: CatalogNode[] = []

  for (const src of LINK_BROWSER_SOURCES) {
    const folder = byId.get(src.rootFolderId)
    if (!folder) continue
    nodes.push({
      id: folder.id,
      name: folder.name,
      iconSrc: browserBrandIconUrl(src.id),
      leaf: true,
      meta: { kind: 'browser-source', source: src.id }
    })
  }

  if (byId.has(LOCAL_COLLECTIONS_ROOT_ID)) {
    nodes.push({
      id: LOCAL_COLLECTIONS_ROOT_ID,
      name: '收藏夹',
      icon: 'folder-open',
      leaf: true,
      meta: { kind: 'local-root' }
    })
  }

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
