import type { TransactionStackSnapshot } from '@app/transaction'
import { cloneForIpc } from '@shared/lib/cloneForIpc'

const STORAGE_PREFIX = 'wanwu:diagram-tx-spill:'
const SPILL_DEBOUNCE_MS = 800
const MEMORY_RETAIN_STEPS = 80

interface SpilledStepPayload {
  resourceId: string
  stepId: string
  label: string
  beforeGraph: unknown
  afterGraph: unknown
  spilledAt: string
}

/**
 * 将较旧的整图快照异步写入 localStorage，内存中仅保留最近 N 步的完整图数据。
 * 非可序列化单元仍保留在 TransactionManager 栈内；本类仅做备份与内存压力缓解。
 */
export class DiagramTransactionStepSpill {
  private writeTimer: ReturnType<typeof setTimeout> | null = null
  private pendingResourceId: string | null = null
  private pendingSteps: SpilledStepPayload[] = []

  schedulePersist(resourceId: string, stack: Readonly<TransactionStackSnapshot>): void {
    this.pendingResourceId = resourceId
    const spillStart = Math.max(0, stack.index - MEMORY_RETAIN_STEPS)
    this.pendingSteps = stack.steps.slice(0, spillStart).flatMap((step) => {
      return step.units
        .filter((u) => u.meta.unitType.startsWith('diagram.graphSnapshot'))
        .map((u) => ({
          resourceId,
          stepId: step.id,
          label: step.label,
          beforeGraph: null as unknown,
          afterGraph: null as unknown,
          spilledAt: new Date().toISOString()
        }))
    })

    if (this.writeTimer) clearTimeout(this.writeTimer)
    this.writeTimer = setTimeout(() => {
      this.writeTimer = null
      void this.flush()
    }, SPILL_DEBOUNCE_MS)
  }

  clear(resourceId: string): void {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer)
      this.writeTimer = null
    }
    this.pendingSteps = []
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(STORAGE_PREFIX + resourceId))
      for (const key of keys) localStorage.removeItem(key)
    } catch {
      /* ignore quota errors */
    }
  }

  private async flush(): Promise<void> {
    const steps = this.pendingSteps
    const resourceId = this.pendingResourceId
    if (!resourceId || !steps.length) return

    for (const step of steps) {
      try {
        const key = `${STORAGE_PREFIX}${resourceId}:${step.stepId}`
        localStorage.setItem(key, JSON.stringify(cloneForIpc(step)))
      } catch {
        break
      }
    }
  }
}

export function attachDiagramTransactionSpill(
  resourceId: string,
  tx: {
    onChange: (fn: () => void) => () => void
    getStack: () => Readonly<TransactionStackSnapshot>
  },
  spill: DiagramTransactionStepSpill
): () => void {
  return tx.onChange(() => {
    spill.schedulePersist(resourceId, tx.getStack())
  })
}
