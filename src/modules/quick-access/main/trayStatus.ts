import type { QuickAccessTrayStatus } from '@shared/types/quickAccess'
import { getMainProcessModules } from '@shared/module-bridge/mainProcessRegistry'
import type { MainProcessInitContext } from '@shared/module-bridge/mainProcessRegistry'

export async function aggregateTrayStatus(ctx: MainProcessInitContext): Promise<QuickAccessTrayStatus> {
  let daily: QuickAccessTrayStatus['daily'] = null
  let rssEntryCount = 0
  let rssFeedCount = 0

  for (const mod of getMainProcessModules()) {
    if (!mod.getTrayStatusSlice) continue
    const slice = await mod.getTrayStatusSlice(ctx)
    if ('daily' in slice) daily = (slice.daily as QuickAccessTrayStatus['daily']) ?? daily
    if (typeof slice.rssEntryCount === 'number') rssEntryCount = slice.rssEntryCount
    if (typeof slice.rssFeedCount === 'number') rssFeedCount = slice.rssFeedCount
  }

  return { daily, rssEntryCount, rssFeedCount }
}
