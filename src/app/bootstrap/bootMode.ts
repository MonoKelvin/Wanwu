import { isDailyWidgetHash } from '@app/utils/dailyWidgetEntry'
import { isTrayMenuHash } from '@app/utils/trayMenuEntry'
import { detectRegisteredBootMode } from '@app/modules/bootModeRegistry'

export type BootMode = 'main' | 'tray-menu' | 'daily-widget' | 'note-popout'

export function detectBootMode(): BootMode {
  if (isTrayMenuHash()) return 'tray-menu'
  if (isDailyWidgetHash()) return 'daily-widget'
  const registered = detectRegisteredBootMode()
  if (registered) return registered
  return 'main'
}

export function isPopoutBootMode(mode: BootMode): boolean {
  return mode !== 'main'
}
