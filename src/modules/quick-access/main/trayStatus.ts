import type { QuickAccessTrayStatus } from '@shared/types/quickAccess'
import { getMainProcessModules } from '@shared/module-bridge/mainProcessRegistry'
import type { MainProcessInitContext } from '@shared/module-bridge/mainProcessRegistry'
import { emptyTrayStatus } from '@modules/quick-access/domain/trayStatus'

export async function aggregateTrayStatus(ctx: MainProcessInitContext): Promise<QuickAccessTrayStatus> {
  const status = emptyTrayStatus()

  for (const mod of getMainProcessModules()) {
    if (!mod.getTrayStatusSlice) continue
    const slice = await mod.getTrayStatusSlice(ctx)
    if (slice.daily) {
      status.daily = slice.daily as QuickAccessTrayStatus['daily']
    }
    const { daily: _daily, ...rest } = slice
    if (Object.keys(rest).length > 0) {
      status.slices[mod.id] = rest
    }
  }

  return status
}
