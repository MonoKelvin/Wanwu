import type { TreeNode } from 'primevue/treenode'

/** 收集树中所有可展开节点的 key，用于默认全部展开 */
export function collectExpandableKeys(nodes: TreeNode[]): Record<string, boolean> {
  const keys: Record<string, boolean> = {}
  const walk = (list: TreeNode[]) => {
    for (const node of list) {
      if (node.children?.length) {
        keys[String(node.key)] = true
        walk(node.children)
      }
    }
  }
  walk(nodes)
  return keys
}

export function mergeExpandedKeys(
  current: Record<string, boolean>,
  nodes: TreeNode[]
): Record<string, boolean> {
  return { ...current, ...collectExpandableKeys(nodes) }
}
