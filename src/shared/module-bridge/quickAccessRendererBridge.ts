import type { QuickAccessHitKind, QuickAccessOpenTarget } from '../types/quickAccess'
import type { WwIconName } from '../icons/registry'

export interface QuickAccessPaletteMeta {
  readonly label: string
  readonly icon: WwIconName
  readonly order?: number
}

export interface QuickAccessOpenContext {
  pushRoute: (location: { name: string; params?: Record<string, string> }) => Promise<void>
  afterRouteReady: () => Promise<void>
}

export interface IQuickAccessTargetHandler {
  readonly kind: string
  readonly order?: number
  readonly paletteMeta?: QuickAccessPaletteMeta
  open(target: QuickAccessOpenTarget, ctx: QuickAccessOpenContext): Promise<boolean | void>
}

export interface QuickAccessKindMeta {
  readonly kind: QuickAccessHitKind | string
  readonly label: string
  readonly icon: WwIconName
  readonly order?: number
}

export interface QuickAccessRendererBindings {
  registerQuickAccessKind(meta: QuickAccessKindMeta): void
  registerQuickAccessTargetHandler(handler: IQuickAccessTargetHandler): void
  getQuickAccessKindMeta(kind: string): QuickAccessKindMeta | undefined
  collectQuickAccessKindOrder(): string[]
  getQuickAccessTargetHandlers(kind: string): IQuickAccessTargetHandler[]
  dispatchQuickAccessTarget(
    target: QuickAccessOpenTarget,
    ctx: QuickAccessOpenContext
  ): Promise<boolean>
}

let bindings: QuickAccessRendererBindings | null = null

export function bindQuickAccessRendererModule(impl: QuickAccessRendererBindings): void {
  bindings = impl
}

export function isQuickAccessRendererReady(): boolean {
  return bindings !== null
}

export function registerQuickAccessKind(meta: QuickAccessKindMeta): void {
  bindings?.registerQuickAccessKind(meta)
}

export function registerQuickAccessTargetHandler(handler: IQuickAccessTargetHandler): void {
  bindings?.registerQuickAccessTargetHandler(handler)
}

export function getQuickAccessKindMeta(kind: string): QuickAccessKindMeta | undefined {
  return bindings?.getQuickAccessKindMeta(kind)
}

export function collectQuickAccessKindOrder(): string[] {
  return bindings?.collectQuickAccessKindOrder() ?? []
}

export function getQuickAccessTargetHandlers(kind: string): IQuickAccessTargetHandler[] {
  return bindings?.getQuickAccessTargetHandlers(kind) ?? []
}

export async function dispatchQuickAccessTarget(
  target: QuickAccessOpenTarget,
  ctx: QuickAccessOpenContext
): Promise<boolean> {
  if (!bindings) return false
  return bindings.dispatchQuickAccessTarget(target, ctx)
}
