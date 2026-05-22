import { existsSync } from 'fs'
import { join } from 'path'
import { getBundledAssetsRoot } from '../core/assetsRoot'

const LOGO_SIZES = [16, 32, 64, 128, 256] as const
export type AppLogoSize = (typeof LOGO_SIZES)[number]

/** 应用窗口 / 任务栏图标（打包后使用 exe 内嵌图标；开发环境用 assets/logo） */
export function resolveAppLogoPath(preferred: AppLogoSize = 256): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron') as typeof import('electron')
    if (app.isPackaged) {
      return process.execPath
    }
  } catch {
    /* 非 Electron 环境 */
  }

  const root = join(getBundledAssetsRoot(), 'logo')
  const order: AppLogoSize[] = [preferred, 256, 128, 64, 32, 16]
  const seen = new Set<AppLogoSize>()
  for (const size of order) {
    if (seen.has(size)) continue
    seen.add(size)
    const abs = join(root, `icon-${size}.png`)
    if (existsSync(abs)) return abs
  }
  return null
}
