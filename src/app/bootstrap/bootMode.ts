import { isDailyWidgetHash } from '@app/utils/dailyWidgetEntry'
import { isNotePopoutHash } from '@app/utils/notePopoutEntry'
import { isTrayMenuHash } from '@app/utils/trayMenuEntry'

export type BootMode = 'main' | 'tray-menu' | 'daily-widget' | 'note-popout'

export function detectBootMode(): BootMode {
  if (isTrayMenuHash()) return 'tray-menu'
  if (isDailyWidgetHash()) return 'daily-widget'
  if (isNotePopoutHash()) return 'note-popout'
  return 'main'
}

export function isPopoutBootMode(mode: BootMode): boolean {
  return mode !== 'main'
}
