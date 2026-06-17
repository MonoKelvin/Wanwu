import type { QuickAccessOpenTarget } from '@shared/types/quickAccess'
import type { WwIconName } from '@shared/icons/registry'

export interface QuickAccessOpenContext {
  pushRoute: (location: { name: string; params?: Record<string, string> }) => Promise<void>
  afterRouteReady: () => Promise<void>
}

export interface QuickAccessPaletteMeta {
  readonly label: string
  readonly icon: WwIconName
  readonly order?: number
}

export interface IQuickAccessTargetHandler {
  readonly kind: string
  readonly order?: number
  readonly paletteMeta?: QuickAccessPaletteMeta
  /** 返回 false 表示未处理，可交给同 kind 的下一个 handler */
  open(target: QuickAccessOpenTarget, ctx: QuickAccessOpenContext): Promise<boolean | void>
}

const handlers = new Map<string, IQuickAccessTargetHandler[]>()

export function registerQuickAccessTargetHandler(handler: IQuickAccessTargetHandler): void {
  const list = handlers.get(handler.kind) ?? []
  list.push(handler)
  handlers.set(handler.kind, list)
}

export function getQuickAccessTargetHandlers(kind: string): IQuickAccessTargetHandler[] {
  return [...(handlers.get(kind) ?? [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  )
}

export function getQuickAccessTargetHandler(kind: string): IQuickAccessTargetHandler | undefined {
  return getQuickAccessTargetHandlers(kind)[0]
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
