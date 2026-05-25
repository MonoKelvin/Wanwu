import type { CatalogNode } from '@library/types/catalog'
import type { LinkFolder } from '@shared/types/links'
import { EDGE_ROOT_FOLDER_ID, LINKS_RECYCLE_BIN_ID } from '@shared/stores/links'

/** 全库侧栏「链接」大分类下仅展示来源根节点（浏览器 / 回收站），不含 Edge 内层文件夹 */
export function buildLinksSourceCatalog(roots: LinkFolder[]): CatalogNode[] {
  const nodes: CatalogNode[] = []
  for (const f of roots) {
    if (f.id === EDGE_ROOT_FOLDER_ID) {
      nodes.push({
        id: f.id,
        name: f.name,
        leaf: true,
        meta: { kind: 'browser-source', source: 'edge' }
      })
    } else if (f.id === LINKS_RECYCLE_BIN_ID) {
      nodes.push({
        id: f.id,
        name: f.name,
        icon: 'trash-2',
        leaf: true,
        meta: { kind: 'recycle-bin', isRecycleBin: true }
      })
    }
  }
  return nodes.sort((a, b) => {
    if (a.id === LINKS_RECYCLE_BIN_ID) return 1
    if (b.id === LINKS_RECYCLE_BIN_ID) return -1
    return a.name.localeCompare(b.name, 'zh-CN')
  })
}
