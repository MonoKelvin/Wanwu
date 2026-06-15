import { inject, provide, type InjectionKey, type ShallowRef, shallowRef } from 'vue'
import type { TransactionManager } from '@app/transaction'

export const DIAGRAM_TRANSACTION_MANAGER_KEY: InjectionKey<ShallowRef<TransactionManager | null>> =
  Symbol('diagram-transaction-manager')

export function provideDiagramTransactionManager(
  manager: TransactionManager | null
): ShallowRef<TransactionManager | null> {
  const ref = shallowRef(manager)
  provide(DIAGRAM_TRANSACTION_MANAGER_KEY, ref)
  return ref
}

export function useDiagramTransactionManager(): ShallowRef<TransactionManager | null> {
  const injected = inject(DIAGRAM_TRANSACTION_MANAGER_KEY, null)
  if (!injected) {
    return shallowRef(null)
  }
  return injected
}

export function setDiagramTransactionManager(
  holder: ShallowRef<TransactionManager | null>,
  manager: TransactionManager | null
): void {
  holder.value = manager
}
