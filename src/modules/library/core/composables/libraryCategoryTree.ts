import type { TreeNode } from 'primevue/treenode'
import { LIBRARY_MAJORS, type LibraryMajorId } from '@modules/library/core/config/majors'
import { catalogToTreeNodes, type CatalogNode } from '@modules/library/core/types/catalog'
import { buildLinksSourceCatalog } from '@modules/library/links/lib/linksSourceCatalog'
import type { LinkFolder } from '@shared/types/links'

export function buildMajorTreeNodes(): TreeNode[] {
  return LIBRARY_MAJORS.map((m) => ({
    key: `major:${m.id}`,
    label: m.name,
    icon: m.icon,
    selectable: true,
    children: undefined,
    data: { kind: 'major', majorId: m.id }
  }))
}

export function handbookCatalogFromCategories(
  categories: Array<{
    id: string
    name: string
    icon?: string
    children?: Array<{ id: string; name: string }>
  }>
): CatalogNode[] {
  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    children: cat.children?.map((sub) => ({
      id: sub.id,
      name: sub.name,
      parentId: cat.id,
      leaf: true
    }))
  }))
}

export function sectionTreeForMajor(
  major: LibraryMajorId,
  options: {
    handbookCategories: CatalogNode[]
    linkSourceRoots: LinkFolder[]
  }
): TreeNode[] {
  if (major === 'illustrated-handbook') {
    return catalogToTreeNodes(options.handbookCategories, (node, parentKey) => {
      if (parentKey) {
        const parentId = parentKey.replace(/^hb:/, '').split('::')[0]
        return `hb:${parentId}::${node.id}`
      }
      return `hb:${node.id}`
    })
  }

  if (major === 'links') {
    const sources = buildLinksSourceCatalog(options.linkSourceRoots)
    return catalogToTreeNodes(sources, (node) => `ln:${node.id}`)
  }

  return []
}

export type LibrarySectionTrees = Partial<Record<LibraryMajorId, TreeNode[]>>

const LOADING_NODE_SUFFIX = '::__loading'

export function isCatalogLoadingNodeKey(key: string): boolean {
  return key.endsWith(LOADING_NODE_SUFFIX)
}

/** 各大分类同时挂载子树，互不折叠顶替 */
export function composeLibraryTree(
  sectionTrees: LibrarySectionTrees,
  options?: {
    majorLoading?: Partial<Record<LibraryMajorId, boolean>>
    majorLoaded?: Partial<Record<LibraryMajorId, boolean>>
  }
): TreeNode[] {
  return buildMajorTreeNodes().map((n) => {
    const majorId = (n.data as { majorId: LibraryMajorId }).majorId
    const key = String(n.key)

    if (options?.majorLoading?.[majorId]) {
      return {
        ...n,
        leaf: false,
        children: [
          {
            key: `${key}${LOADING_NODE_SUFFIX}`,
            label: '加载中…',
            leaf: true,
            selectable: false,
            data: { kind: 'loading' }
          }
        ]
      }
    }

    const section = sectionTrees[majorId]
    if (section?.length) {
      return { ...n, leaf: false, children: section }
    }

    if (options?.majorLoaded?.[majorId]) {
      return { ...n, leaf: true }
    }

    return { ...n, leaf: false, children: [] }
  })
}
