import { homedir } from 'os'
import { join } from 'path'

/** 与 package.json `name` 一致，决定 Electron userData 目录名 */
export const ELECTRON_USER_DATA_FOLDER = 'wanwu'

function loadElectronApp(): typeof import('electron').app | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('electron') as typeof import('electron')).app
  } catch {
    return null
  }
}

/** Electron `app.getPath`；构建脚本等非 Electron 进程下回退到 %APPDATA%/wanwu */
export function getElectronPath(name: 'userData' | 'appData'): string {
  const app = loadElectronApp()
  if (app) return app.getPath(name)
  const roaming = process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming')
  if (name === 'appData') return roaming
  return join(roaming, ELECTRON_USER_DATA_FOLDER)
}

export function isElectronPackaged(): boolean {
  const app = loadElectronApp()
  return Boolean(app?.isPackaged)
}
