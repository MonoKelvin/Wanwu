import type { WwIconName } from '@shared/icons/registry'
import type { QuickAccessHitKind } from '@shared/types/quickAccess'

export interface QuickAccessKindMeta {
  readonly kind: QuickAccessHitKind | string
  readonly label: string
  readonly icon: WwIconName
  readonly order?: number
}

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
