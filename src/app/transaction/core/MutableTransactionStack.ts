import type { TransactionStep } from '../domain/types'

export class MutableTransactionStack {
  steps: TransactionStep[] = []
  index = 0
  cleanIndex = 0

  truncateRedoBranch(): void {
    if (this.index < this.steps.length) {
      this.steps.length = this.index
    }
  }

  pushStep(step: TransactionStep): void {
    this.truncateRedoBranch()
    this.steps.push(step)
    this.index = this.steps.length
  }

  canUndo(): boolean {
    return this.index > 0
  }

  canRedo(): boolean {
    return this.index < this.steps.length
  }

  undoLabel(): string | null {
    if (!this.canUndo()) return null
    return this.steps[this.index - 1]?.label ?? null
  }

  redoLabel(): string | null {
    if (!this.canRedo()) return null
    return this.steps[this.index]?.label ?? null
  }

  isClean(): boolean {
    return this.index === this.cleanIndex
  }

  clear(): void {
    this.steps = []
    this.index = 0
    this.cleanIndex = 0
  }
}
