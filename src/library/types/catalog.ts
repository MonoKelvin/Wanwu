import type { TreeNode } from 'primevue/treenode'

/** 通用目录节点（可多级） */
export interface CatalogNode {
  id: string
  name: string
  parentId?: string | null
  icon?: string
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
    return {
      key,
      label: node.name,
      icon: node.icon,
      leaf: node.leaf ?? !children?.length,
      children,
      data: node
    }
  })
}
