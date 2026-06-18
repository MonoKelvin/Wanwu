import type {
  IQuickAccessTargetHandler,
  QuickAccessOpenContext
} from '@shared/module-bridge/quickAccessRendererBridge'
import type { QuickAccessOpenTarget } from '@shared/types/quickAccess'

const handlers = new Map<string, IQuickAccessTargetHandler[]>()

export function registerQuickAccessTargetHandler(handler: IQuickAccessTargetHandler): void {
  const list = handlers.get(handler.kind) ?? []
  list.push(handler)
  handlers.set(handler.kind, list)
}

export function getQuickAccessTargetHandlers(kind: string): IQuickAccessTargetHandler[] {
  return [...(handlers.get(kind) ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export async function dispatchQuickAccessTarget(
  target: QuickAccessOpenTarget,
  ctx: QuickAccessOpenContext
): Promise<boolean> {
  for (const handler of getQuickAccessTargetHandlers(target.kind)) {
    const handled = await handler.open(target, ctx)
    if (handled !== false) return true
  }
  return false
}
