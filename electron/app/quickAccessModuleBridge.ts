import type { QuickAccessHit } from '../../src/shared/types/quickAccess'
import type { MainProcessInitContext } from '../../src/shared/module-bridge/mainProcessRegistry'
import { getMainProcessModules } from '../../src/shared/module-bridge/mainProcessRegistry'

const DEFAULT_KIND_LIMIT = 4

export function getRegisteredQuickAccessKindLimits(): Map<string, number> {
  const limits = new Map<string, number>()
  for (const mod of getMainProcessModules()) {
    const meta = mod.getQuickAccessKindLimit?.()
    if (meta) limits.set(meta.kind, meta.limit)
  }
  return limits
}

export function getRegisteredQuickAccessKindOrder(): string[] {
  return getMainProcessModules()
    .map((mod) => mod.getQuickAccessKindLimit?.())
    .filter((meta): meta is NonNullable<typeof meta> => Boolean(meta))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((meta) => meta.kind)
}

export async function searchModuleQuickAccessHits(
  ctx: MainProcessInitContext,
  kind: string,
  query: string
): Promise<QuickAccessHit[]> {
  const mod = getMainProcessModules().find((m) => m.getQuickAccessKindLimit?.()?.kind === kind)
  if (!mod?.searchQuickAccess) return []
  const limit = mod.getQuickAccessKindLimit?.()?.limit ?? DEFAULT_KIND_LIMIT
  return (await mod.searchQuickAccess(ctx, query, limit)) ?? []
}

export async function searchAllModuleQuickAccessHits(
  ctx: MainProcessInitContext,
  query: string
): Promise<QuickAccessHit[]> {
  const chunks = await Promise.all(
    getMainProcessModules().map(async (mod) => {
      const meta = mod.getQuickAccessKindLimit?.()
      if (!mod.searchQuickAccess || !meta) return []
      return mod.searchQuickAccess(ctx, query, meta.limit)
    })
  )
  return chunks.flat()
}
