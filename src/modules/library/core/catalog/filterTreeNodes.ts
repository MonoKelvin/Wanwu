import type { TreeNode } from 'primevue/treenode'

/** 按标签过滤树，保留匹配节点及其祖先链 */
export function filterTreeNodes(nodes: TreeNode[], query: string): TreeNode[] {
  const q = query.trim().toLowerCase()
  if (!q) return nodes

  const result: TreeNode[] = []
  for (const node of nodes) {
    const label = String(node.label ?? '').toLowerCase()
    const selfMatch = label.includes(q)
    const filteredChildren = node.children?.length ? filterTreeNodes(node.children, q) : undefined
    if (selfMatch) {
      result.push(node)
    } else if (filteredChildren?.length) {
      result.push({ ...node, children: filteredChildren })
    }
  }
  return result
}
