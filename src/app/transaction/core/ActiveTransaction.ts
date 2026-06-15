import type { ITransactionUnit } from '../domain/types'

export interface TransactionScope {
  readonly id: string
  /** 根会话 id，嵌套 scope 共享同一 sessionId */
  readonly sessionId: string
  readonly label: string
  readonly groupId?: string | number
  readonly startUnitIndex: number
  readonly depth: number
  readonly parentScopeId: string | null
  readonly isRoot: boolean
}

export class ActiveTransaction {
  readonly scopes = new Map<string, TransactionScopeState>()
  readonly sessionId: string
  /** 当前最深未关闭 scope，用于嵌套 begin 挂接 */
  currentScopeId: string

  constructor(
    readonly rootScopeId: string,
    initialScope: TransactionScope,
    sessionId?: string
  ) {
    this.sessionId = sessionId ?? initialScope.id
    this.currentScopeId = initialScope.id
    this.scopes.set(initialScope.id, { scope: initialScope, units: [] })
  }

  getScope(scopeId: string): TransactionScopeState | undefined {
    return this.scopes.get(scopeId)
  }

  getRootScope(): TransactionScope | undefined {
    return this.scopes.get(this.rootScopeId)?.scope
  }

  allUnits(): ITransactionUnit[] {
    const root = this.scopes.get(this.rootScopeId)
    return root?.units ?? []
  }

  validateScope(scope: TransactionScope): boolean {
    return this.scopes.has(scope.id)
  }
}

export interface TransactionScopeState {
  scope: TransactionScope
  units: ITransactionUnit[]
}
