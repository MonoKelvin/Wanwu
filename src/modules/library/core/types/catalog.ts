import type { TreeNode } from 'primevue/treenode'

/** 通用目录节点（可多级） */
export interface CatalogNode {
  id: string
  name: string
  parentId?: string | null
  /** Lucide / WwIcon 名称 */
  icon?: string
  /** 品牌 SVG（如 assets/icons/browser-*.svg） */
  iconSrc?: string
  children?: CatalogNode[]
  /** 叶子节点：无子级或业务上作为可选终点 */
  leaf?: boolean
  /** 业务扩展 */
  meta?: Record<string, unknown>
}

export function catalogToTreeNodes(
  nodes: CatalogNode[],
  keyForNode: (node: CatalogNode, parentKey?: string) => string,
  parentKey?: string
): TreeNode[] {
  return nodes.map((node) => {
    const key = keyForNode(node, parentKey)
    const children = node.children?.length
      ? catalogToTreeNodes(node.children, keyForNode, key)
      : undefined
    const hasChildren = !!children?.length
    return {
      key,
      label: node.name,
      icon: node.icon,
      leaf: node.leaf ?? !hasChildren,
      children: hasChildren ? children : undefined,
      data: node
    }
  })
}
