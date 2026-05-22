import { existsSync } from 'fs'
import { join } from 'path'
import { getBundledAssetsRoot } from '../core/assetsRoot'

const LOGO_SIZES = [16, 32, 64, 128, 256] as const
export type AppLogoSize = (typeof LOGO_SIZES)[number]

/** 应用窗口 / 任务栏图标（优先 256，回退任意已有尺寸） */
export function resolveAppLogoPath(preferred: AppLogoSize = 256): string | null {
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
