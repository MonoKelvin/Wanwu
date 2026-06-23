import { contextBridge, ipcRenderer } from 'electron'
import type { WanwuApi } from '../src/shared/types/api'
import '../src/app/platform/wanwuApiRegistry'
import './preloadBootstrap'
import { getPreloadModules } from '../src/shared/module-bridge/preloadRegistry'
import type { AppSettings } from '../src/shared/types/settings'

const api: WanwuApi = {
  app: {
    getPaths: () => ipcRenderer.invoke('app:getPaths'),
    getStartupNotices: () => ipcRenderer.invoke('app:getStartupNotices'),
    onStartupNotice: (listener: (message: string) => void) => {
      const handler = (_event: unknown, message: string) => listener(message)
      ipcRenderer.on('app:startup-notice', handler)
      return () => ipcRenderer.removeListener('app:startup-notice', handler)
    },
    openDataDirectory: () => ipcRenderer.invoke('app:openDataDirectory'),
    pickDataDirectoryParent: () => ipcRenderer.invoke('app:pickDataDirectoryParent'),
    migrateDataDirectory: (params) => ipcRenderer.invoke('app:migrateDataDirectory', params),
    getSettings: () => ipcRenderer.invoke('app:getSettings'),
    updateSettings: (settings: unknown) => ipcRenderer.invoke('app:updateSettings', settings),
    patchSettings: (patch: unknown) => ipcRenderer.invoke('app:patchSettings', patch),
    onAppSettingsChanged: (listener: (settings: AppSettings) => void) => {
      const handler = (_: unknown, settings: AppSettings) => listener(settings)
      ipcRenderer.on('app:settings-changed', handler)
      return () => {
        ipcRenderer.removeListener('app:settings-changed', handler)
      }
    },
    createBackup: () => ipcRenderer.invoke('app:createBackup'),
    restoreBackup: () => ipcRenderer.invoke('app:restoreBackup'),
    clearCache: () => ipcRenderer.invoke('app:clearCache'),
    resetSettings: () => ipcRenderer.invoke('app:resetSettings'),
    exportDiagnostics: () => ipcRenderer.invoke('app:exportDiagnostics')
  },
  window: {
    getPlatform: () => ipcRenderer.invoke('window:getPlatform'),
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggleMaximize'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    close: () => ipcRenderer.invoke('window:close'),
    resolveClosePrompt: (choice: 'tray' | 'quit' | 'cancel') =>
      ipcRenderer.invoke('window:resolveClosePrompt', choice),
    onClosePrompt: (listener: () => void) => {
      const handler = () => listener()
      ipcRenderer.on('window:close-prompt', handler)
      return () => ipcRenderer.removeListener('window:close-prompt', handler)
    },
    onMaximizedChange: (listener: (maximized: boolean) => void) => {
      const handler = (_event: unknown, maximized: boolean) => listener(maximized)
      ipcRenderer.on('window:maximized-changed', handler)
      return () => ipcRenderer.removeListener('window:maximized-changed', handler)
    }
  },
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
    downloadFile: (params) => ipcRenderer.invoke('shell:downloadFile', params),
    showItemInFolder: (url) => ipcRenderer.invoke('shell:showItemInFolder', url),
    copyText: (text) => ipcRenderer.invoke('shell:copyText', text),
    copyImage: (url) => ipcRenderer.invoke('shell:copyImage', url),
    pickImageFile: () => ipcRenderer.invoke('shell:pickImageFile'),
    pickSavePath: (params: {
      defaultPath?: string
      filters?: { name: string; extensions: string[] }[]
    }) => ipcRenderer.invoke('shell:pickSavePath', params),
    savePngDataUrl: (params) => ipcRenderer.invoke('shell:savePngDataUrl', params),
    saveImageDataUrl: (params) => ipcRenderer.invoke('shell:saveImageDataUrl', params),
    saveClipboardImageDataUrlToTemp: (params) =>
      ipcRenderer.invoke('shell:saveClipboardImageDataUrlToTemp', params),
    saveTextFile: (params) => ipcRenderer.invoke('shell:saveTextFile', params),
    cacheImageForViewer: (url) => ipcRenderer.invoke('shell:cacheImageForViewer', url),
    releaseViewerImageCache: (cacheId) =>
      ipcRenderer.invoke('shell:releaseViewerImageCache', cacheId)
  },
  share: {
    canNativeShare: () => ipcRenderer.invoke('share:canNativeShare'),
    nativeShare: (params) => ipcRenderer.invoke('share:nativeShare', params),
    uploadTemp: (params) => ipcRenderer.invoke('share:uploadTemp', params)
  }
}

function mergeModulePreloadApi(base: WanwuApi): WanwuApi {
  const merged = { ...base } as Record<string, unknown>
  for (const mod of getPreloadModules()) {
    try {
      const block = mod.getPreloadApi?.(ipcRenderer)
      if (block) Object.assign(merged, block)
    } catch (err) {
      console.error(`[preload] getPreloadApi failed for ${mod.id}`, err)
    }
  }
  return merged as WanwuApi
}

contextBridge.exposeInMainWorld('wanwu', mergeModulePreloadApi(api))
