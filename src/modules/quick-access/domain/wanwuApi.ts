import type {
  ClipboardAssistPayload,
  DailyPickPreview,
  QuickAccessHit,
  QuickAccessHitKind,
  QuickAccessOpenTarget,
  QuickAccessTrayStatus
} from '@shared/types/quickAccess'
import type { TrayMenuAction, TrayMenuContext } from '@shared/types/trayMenu'

/** 快捷访问 / 托盘 / 命令面板 IPC 能力块 */
export interface WanwuQuickAccessApi {
  quickAccess: {
    search: (params: { query: string; limit?: number }) => Promise<QuickAccessHit[]>
    searchByKind: (params: {
      kind: QuickAccessHitKind
      query: string
    }) => Promise<QuickAccessHit[]>
    getDailyPick: () => Promise<DailyPickPreview | null>
    getTrayStatus: () => Promise<QuickAccessTrayStatus>
    showDailyWidget: () => Promise<void>
    hideDailyWidget: () => Promise<void>
    openDailyInMain: () => Promise<void>
    getTrayMenuContext: () => Promise<TrayMenuContext>
    trayMenuAction: (action: TrayMenuAction) => Promise<void>
    hideTrayMenu: () => Promise<void>
    reportTrayMenuLayout: (size: { width: number; height: number }) => Promise<void>
    onTrayMenuShow: (listener: () => void) => () => void
    onTogglePalette: (listener: () => void) => () => void
    onOpenTarget: (listener: (target: QuickAccessOpenTarget) => void) => () => void
    onClipboardMatches: (listener: (payload: ClipboardAssistPayload) => void) => () => void
  }
}

declare module '@shared/types/api' {
  interface WanwuApi extends WanwuQuickAccessApi {}
}
