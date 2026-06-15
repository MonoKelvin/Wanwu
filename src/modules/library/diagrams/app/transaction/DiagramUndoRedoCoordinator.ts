import type { OperationResult } from '@app/transaction'

/** 串行化 undo/redo，避免连续快捷键导致栈索引与画布状态不一致 */
export class DiagramUndoRedoCoordinator {
  private tail: Promise<void> = Promise.resolve()

  run<T>(fn: () => Promise<OperationResult<T>>): Promise<OperationResult<T>> {
    const next = this.tail.then(() => fn())
    this.tail = next.then(
      () => undefined,
      () => undefined
    )
    return next
  }

  reset(): void {
    this.tail = Promise.resolve()
  }
}
