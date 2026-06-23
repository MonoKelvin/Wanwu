/** 平台能力 IPC（窗口、Shell、分享）；非业务模块，由组合根统一注册 */
export interface WanwuPlatformApi {
  window: {
    getPlatform: () => Promise<'win32' | 'darwin' | 'linux'>
    minimize: () => Promise<void>
    toggleMaximize: () => Promise<boolean>
    isMaximized: () => Promise<boolean>
    close: () => Promise<void>
    resolveClosePrompt: (choice: 'tray' | 'quit' | 'cancel') => Promise<void>
    onClosePrompt: (listener: () => void) => () => void
    onMaximizedChange: (listener: (maximized: boolean) => void) => () => void
  }
  shell: {
    openExternal: (url: string) => Promise<void>
    downloadFile: (params: {
      url: string
      defaultName?: string
    }) => Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }>
    showItemInFolder: (pathOrUrl: string) => Promise<{ ok: boolean; error?: string }>
    copyText: (text: string) => Promise<void>
    copyImage: (url: string) => Promise<{ ok: boolean; error?: string }>
    pickImageFile: () => Promise<{ ok: boolean; path?: string; canceled?: boolean }>
    pickSavePath: (params: {
      defaultPath?: string
      filters?: { name: string; extensions: string[] }[]
    }) => Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }>
    savePngDataUrl: (params: {
      dataUrl: string
      defaultName?: string
    }) => Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }>
    saveImageDataUrl: (params: {
      dataUrl: string
      defaultName?: string
    }) => Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }>
    saveClipboardImageDataUrlToTemp: (params: {
      dataUrl: string
    }) => Promise<{ ok: boolean; path?: string; error?: string }>
    saveTextFile: (params: {
      content: string
      defaultName?: string
      extension?: string
    }) => Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }>
    cacheImageForViewer: (url: string) => Promise<{
      ok: boolean
      displayUrl?: string
      cacheId?: number
      error?: string
    }>
    releaseViewerImageCache: (cacheId: number) => Promise<void>
  }
  share: {
    canNativeShare: () => Promise<boolean>
    nativeShare: (params: {
      title?: string
      text?: string
      dataUrl?: string
      textContent?: string
      fileName: string
    }) => Promise<{ ok: boolean; canceled?: boolean; error?: string }>
    uploadTemp: (params: {
      dataUrl?: string
      textContent?: string
      fileName: string
      expire?: '1h' | '12h' | '24h' | '72h'
    }) => Promise<
      | { ok: true; url: string; expire: string; expiresInHours: number }
      | { ok: false; error: string }
    >
  }
}

declare module '@shared/types/api' {
  interface WanwuApi extends WanwuPlatformApi {}
}
