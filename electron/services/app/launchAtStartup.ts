import { app } from 'electron'

export function canApplyLaunchAtStartup(): boolean {
  return app.isPackaged
}

export function readLaunchAtStartupFromOs(): boolean {
  if (!canApplyLaunchAtStartup()) return false
  try {
    return app.getLoginItemSettings().openAtLogin
  } catch (err) {
    console.warn('[wanwu] failed to read launch at startup', err)
    return false
  }
}

export function applyLaunchAtStartup(enabled: boolean): void {
  if (!canApplyLaunchAtStartup()) return
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: process.execPath
    })
  } catch (err) {
    console.warn('[wanwu] failed to set launch at startup', err)
  }
}
