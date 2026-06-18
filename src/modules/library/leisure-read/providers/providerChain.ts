import type { LeisureReadTabId, LeisureReadContent } from '@modules/library/leisure-read/domain/types'
import { LeisureReadFetchError } from '@modules/library/leisure-read/domain/types'
import { resolveProviderList } from '@modules/library/leisure-read/domain/providerChains'
import type { LeisureReadModuleSettings } from '@modules/library/leisure-read/domain/settings'
import { createProvider } from '@modules/library/leisure-read/providers/registry'
import type { FetchFn } from '@modules/library/leisure-read/providers/types'

export const LEISURE_READ_FETCH_TIMEOUT_MS = 8000

export async function fetchViaProviderChain(
  tab: LeisureReadTabId,
  settings: LeisureReadModuleSettings,
  fetchFn: FetchFn,
  signal?: AbortSignal
): Promise<LeisureReadContent> {
  const chain = resolveProviderList(tab, settings)
  const errors: string[] = []

  for (const providerId of chain) {
    try {
      const provider = createProvider(providerId, fetchFn)
      return await provider.fetch(tab, signal)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${providerId}: ${msg}`)
      console.warn(`[leisure-read] provider failed: ${providerId}`, err)
    }
  }

  throw new LeisureReadFetchError(errors.join('; ') || 'all_providers_failed')
}
