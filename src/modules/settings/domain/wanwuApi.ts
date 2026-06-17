import type { AppSettings } from '@shared/types/settings'

/** 应用级 IPC（设置、备份、数据目录）；由设置模块注册 */
export interface WanwuAppApi {
  app: {
    getPaths: () => Promise<{
      userData: string
      wanwu: string
      defaultWanwu: string
      isCustom: boolean
    }>
    getStartupNotices: () => Promise<string[]>
    /** 图鉴 bootstrap 完成后推送（如导入失败提示） */
    onStartupNotice: (listener: (message: string) => void) => () => void
    openDataDirectory: () => Promise<{ ok: boolean }>
    pickDataDirectoryParent: () => Promise<
      | { ok: true; parentDir: string; targetPath: string }
      | { ok: false; canceled?: boolean; error?: string }
    >
    migrateDataDirectory: (params: {
      parentDir: string
      overwriteExisting?: boolean
    }) => Promise<
      | { ok: true; targetPath: string }
      | { ok: false; error: string; code?: string }
    >
    getSettings: () => Promise<AppSettings>
    updateSettings: (settings: AppSettings) => Promise<AppSettings>
    patchSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>
    onAppSettingsChanged: (listener: (settings: AppSettings) => void) => () => void
    createBackup: () => Promise<
      | { ok: true; path: string; bytes: number }
      | { ok: false; canceled?: boolean; error?: string }
    >
    restoreBackup: () => Promise<{ ok: true } | { ok: false; canceled?: boolean; error?: string }>
    clearCache: () => Promise<{ ok: true; bytesFreed: number }>
    resetSettings: () => Promise<AppSettings>
    exportDiagnostics: () => Promise<
      | { ok: true; path: string }
      | { ok: false; canceled?: boolean; error?: string }
    >
  }
}

declare module '@shared/types/api' {
  interface WanwuApi extends WanwuAppApi {}
}
