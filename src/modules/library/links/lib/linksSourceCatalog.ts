import type { CatalogNode } from '@shared/types/catalog'
import type { LinkFolder } from '@modules/library/links/domain/types'
import {
  LINKS_RECYCLE_BIN_ID,
  LOCAL_COLLECTIONS_ROOT_ID
} from '@modules/library/links/domain/constants'
import { browserBrandIconUrl } from '@modules/library/links/domain/browserBrandIcons'
import { LINK_BROWSER_SOURCES } from '@modules/library/links/domain/sources'

/** 全库侧栏「链接」顶级来源节点：各浏览器根、本地收藏夹、回收站（不展开子文件夹） */
/**
 * 根据文件夹根列表构建链接模块在全库侧栏的顶级目录节点。
 * @param roots 链接 store 中的扁平/树形文件夹根（含浏览器根、本地根、回收站）
 */
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
