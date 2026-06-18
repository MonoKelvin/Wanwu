import type { QuickAccessKindMeta } from '@shared/module-bridge/quickAccessRendererBridge'

const kinds = new Map<string, QuickAccessKindMeta>()

export function registerQuickAccessKind(meta: QuickAccessKindMeta): void {
  kinds.set(meta.kind, meta)
}

export function getQuickAccessKindMeta(kind: string): QuickAccessKindMeta | undefined {
  return kinds.get(kind)
}

export function collectQuickAccessKindOrder(): string[] {
  return [...kinds.values()]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((item) => item.kind)
}
