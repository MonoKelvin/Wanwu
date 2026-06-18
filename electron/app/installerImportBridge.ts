/** 安装程序图鉴包导入（由 illustrated-handbook 模块在 register 时注入） */
export interface InstallerLibraryImportResult {
  ok: boolean
  status: 'none' | 'installed' | 'skipped' | 'failed'
  message: string
}

export type InstallerLibraryPackImportFn = (
  dataPath: string,
  zipPath: string
) => Promise<InstallerLibraryImportResult>

let importFn: InstallerLibraryPackImportFn | null = null

export function registerInstallerLibraryPackImport(fn: InstallerLibraryPackImportFn): void {
  importFn = fn
}

export function getInstallerLibraryPackImport(): InstallerLibraryPackImportFn | null {
  return importFn
}
