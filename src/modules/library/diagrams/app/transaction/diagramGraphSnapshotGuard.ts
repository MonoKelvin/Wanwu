import type { OperationResult } from '@app/transaction'

export interface DiagramGraphLike {
  nodes?: unknown[]
  edges?: unknown[]
}

export function countGraphElements(graph: unknown): { nodes: number; edges: number } {
  const g = graph as DiagramGraphLike | null | undefined
  return {
    nodes: Array.isArray(g?.nodes) ? g.nodes.length : 0,
    edges: Array.isArray(g?.edges) ? g.edges.length : 0
  }
}

export function isValidGraphSnapshot(graph: unknown): boolean {
  if (graph == null || typeof graph !== 'object') return false
  const g = graph as DiagramGraphLike
  return Array.isArray(g.nodes) && Array.isArray(g.edges)
}

/** 拒绝将非空画布恢复到空快照（防止误删全图） */
export function guardGraphRevert(
  currentGraph: unknown,
  targetGraph: unknown,
  phase: 'revert' | 'reapply'
): OperationResult | null {
  if (!isValidGraphSnapshot(targetGraph)) {
    return {
      ok: false,
      code: 'TX_REVERT_FAILED',
      message: phase === 'revert' ? '无效的画布快照，已取消撤销' : '无效的画布快照，已取消重做'
    }
  }

  const current = countGraphElements(currentGraph)
  const target = countGraphElements(targetGraph)

  if (current.nodes > 0 && target.nodes === 0) {
    return {
      ok: false,
      code: 'TX_REVERT_FAILED',
      message:
        phase === 'revert'
          ? '快照异常（目标为空画布），已取消撤销以保护当前内容'
          : '快照异常（目标为空画布），已取消重做'
    }
  }

  return null
}
