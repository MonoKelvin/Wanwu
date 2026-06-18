import type { AppServices } from '../../../../../electron/ipc/types'
import { createMainProcessContext } from '../../../../../electron/app/mainProcessContext'
import {
  getRegisteredQuickAccessKindLimits,
  getRegisteredQuickAccessKindOrder,
  searchModuleQuickAccessHits
} from '../../../../../electron/app/quickAccessModuleBridge'
import { getMainProcessModules } from '@shared/module-bridge/mainProcessRegistry'
import type { QuickAccessHit, QuickAccessHitKind } from '@shared/types/quickAccess'

const FALLBACK_KIND_LIMIT: Record<string, number> = {
  library: 8,
  note: 4,
  link: 4,
  rss: 4,
  music: 6,
  favorite: 4,
  diagram: 6
}

function getKindLimit(kind: string): number {
  return getRegisteredQuickAccessKindLimits().get(kind) ?? FALLBACK_KIND_LIMIT[kind] ?? 4
}

function buildPaletteKindOrder(): string[] {
  const registered = getRegisteredQuickAccessKindOrder()
  if (registered.length > 0) return registered
  return Object.keys(FALLBACK_KIND_LIMIT)
}

export async function searchHitsByKind(
  services: AppServices,
  kind: QuickAccessHitKind,
  query: string
): Promise<QuickAccessHit[]> {
  const term = query.trim()
  if (!term) return []
  const ctx = createMainProcessContext(services)
  return searchModuleQuickAccessHits(ctx, kind, term)
}

export async function unifiedSearch(
  services: AppServices,
  query: string,
  limit = 24
): Promise<QuickAccessHit[]> {
  const term = query.trim()
  if (!term) return []

  const chunks = await Promise.all(
    buildPaletteKindOrder().map((kind) => searchHitsByKind(services, kind, term))
  )

  const merged: QuickAccessHit[] = []
  for (const chunk of chunks) merged.push(...chunk)
  return merged.slice(0, limit)
}

export async function clipboardLibraryHints(
  services: AppServices,
  text: string,
  limit = 3
): Promise<QuickAccessHit[]> {
  const ctx = createMainProcessContext(services)
  for (const mod of getMainProcessModules()) {
    if (!mod.getClipboardAssistHints) continue
    return (await mod.getClipboardAssistHints(ctx, text, limit)) ?? []
  }
  return []
}

export { getKindLimit }
