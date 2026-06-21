import type { QuickAccessTrayStatus } from '@shared/types/quickAccess'
import { RSS_MODULE_ID } from '@modules/rss/domain/moduleId'

export function readRssTrayCounts(
  status: QuickAccessTrayStatus
): { entryCount: number; feedCount: number } {
  const slice = status.slices[RSS_MODULE_ID]
  const entryCount = typeof slice?.entryCount === 'number' ? slice.entryCount : 0
  const feedCount = typeof slice?.feedCount === 'number' ? slice.feedCount : 0
  return { entryCount, feedCount }
}

export function emptyTrayStatus(): QuickAccessTrayStatus {
  return { daily: null, slices: {} }
}
