import type { TreeNode } from 'primevue/treenode'
import { LIBRARY_MAJORS, type LibraryMajorId } from '@library/config/majors'
import { catalogToTreeNodes, type CatalogNode } from '@library/types/catalog'
import { buildLinksSourceCatalog } from '@features/library/links/linksSourceCatalog'
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

export function composeLibraryTree(
  activeMajor: LibraryMajorId | null,
  sectionTree: TreeNode[]
): TreeNode[] {
  const majors = buildMajorTreeNodes()
  if (!activeMajor) return majors

  return majors.map((n) => {
    const majorId = (n.data as { majorId: LibraryMajorId }).majorId
    if (majorId !== activeMajor) return { ...n, children: undefined }
    return {
      ...n,
      children: sectionTree.length ? sectionTree : undefined
    }
  })
}
