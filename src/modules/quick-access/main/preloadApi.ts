import type { IpcRenderer } from 'electron'
import type { IPreloadModule } from '@shared/module-bridge/preloadRegistry'
import { QUICK_ACCESS_MODULE_ID } from '@modules/quick-access/domain/moduleId'

export const quickAccessPreloadModule: IPreloadModule = {
  id: QUICK_ACCESS_MODULE_ID,
  order: 0,

  getPreloadApi(ipcRenderer: IpcRenderer) {
    return {
      quickAccess: {
        search: (params: { query: string; limit?: number }) =>
          ipcRenderer.invoke('quick-access:search', params),
        searchByKind: (params: {
          kind: import('@shared/types/quickAccess').QuickAccessHitKind
          query: string
        }) => ipcRenderer.invoke('quick-access:searchByKind', params),
        getDailyPick: () => ipcRenderer.invoke('quick-access:getDailyPick'),
        getTrayStatus: () => ipcRenderer.invoke('quick-access:getTrayStatus'),
        showDailyWidget: () => ipcRenderer.invoke('quick-access:showDailyWidget'),
        hideDailyWidget: () => ipcRenderer.invoke('quick-access:hideDailyWidget'),
        openDailyInMain: () => ipcRenderer.invoke('quick-access:openDailyInMain'),
        getTrayMenuContext: () => ipcRenderer.invoke('quick-access:getTrayMenuContext'),
        trayMenuAction: (action: import('@shared/types/trayMenu').TrayMenuAction) =>
          ipcRenderer.invoke('quick-access:trayMenuAction', action),
        hideTrayMenu: () => ipcRenderer.invoke('quick-access:hideTrayMenu'),
        reportTrayMenuLayout: (size: { width: number; height: number }) =>
          ipcRenderer.invoke('quick-access:reportTrayMenuLayout', size),
        onTrayMenuShow: (listener: () => void) => {
          const handler = () => listener()
          ipcRenderer.on('tray-menu:show', handler)
          return () => ipcRenderer.removeListener('tray-menu:show', handler)
        },
        onTogglePalette: (listener: () => void) => {
          const handler = () => listener()
          ipcRenderer.on('quick-access:toggle-palette', handler)
          return () => ipcRenderer.removeListener('quick-access:toggle-palette', handler)
        },
        onOpenTarget: (
          listener: (target: import('@shared/types/quickAccess').QuickAccessOpenTarget) => void
        ) => {
          const handler = (
            _: unknown,
            target: import('@shared/types/quickAccess').QuickAccessOpenTarget
          ) => listener(target)
          ipcRenderer.on('quick-access:open-target', handler)
          return () => ipcRenderer.removeListener('quick-access:open-target', handler)
        },
        onClipboardMatches: (
          listener: (payload: import('@shared/types/quickAccess').ClipboardAssistPayload) => void
        ) => {
          const handler = (
            _: unknown,
            payload: import('@shared/types/quickAccess').ClipboardAssistPayload
          ) => listener(payload)
          ipcRenderer.on('quick-access:clipboard-matches', handler)
          return () => ipcRenderer.removeListener('quick-access:clipboard-matches', handler)
        }
      }
    }
  }
}
