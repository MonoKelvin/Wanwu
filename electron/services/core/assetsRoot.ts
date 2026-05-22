import { join } from 'path'

/**
 * 捆绑资源根目录（开发：仓库 assets/；打包：resources/assets/）。
 * 构建脚本（非 Electron）下回退到 process.cwd()/assets。
 */
export function getBundledAssetsRoot(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron') as typeof import('electron')
    if (app.isPackaged) {
      return join(process.resourcesPath, 'assets')
    }
  } catch {
    /* tsx / node 构建脚本 */
  }
  return join(process.cwd(), 'assets')
}

/** @deprecated 使用 getBundledAssetsRoot */
export const getLibraryAssetsRoot = getBundledAssetsRoot
