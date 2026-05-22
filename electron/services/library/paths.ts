import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { getWanwuDataDirectory, readWanwuPathConfig } from '../data/paths'
import { getBundledAssetsRoot } from '../core/assetsRoot'
import { isElectronPackaged } from '../core/electronRuntime'

/** 种子配置目录（仅开发/构建；正式安装包不含 seed，数据来自 library-data-pack.zip） */
export function getLibrarySeedRoot(): string {
  return join(getBundledAssetsRoot(), 'seed', 'library')
}

export function isBundledLibrarySeedAvailable(): boolean {
  return existsSync(getLibraryCatalogPath())
}

export function getLibraryCategoriesPath(): string {
  return join(getLibrarySeedRoot(), 'categories.json')
}

export function getLibraryCatalogPath(): string {
  return join(getLibrarySeedRoot(), 'catalog.json')
}

export const LIBRARY_PACK_ZIP = 'library-data-pack.zip'

/** 构建产物：assets/packed（开发） */
export function getLibraryPackedDir(): string {
  return join(getBundledAssetsRoot(), 'packed')
}

/** 打包后：Wanwu.exe 所在目录 */
export function getAppInstallDir(): string | null {
  try {
    if (!isElectronPackaged()) return null
    return dirname(process.execPath)
  } catch {
    return null
  }
}

/**
 * 待导入的图鉴 zip（仅用户明确放置或安装程序写入的路径，不扫描构建产物目录）。
 * 顺序：配置路径 → 安装目录 → 数据目录下的 zip。
 */
export function discoverLibraryPackZip(): string | null {
  const seen = new Set<string>()
  const candidates: string[] = []

  const configured = readWanwuPathConfig().libraryPackPath?.trim()
  if (configured) candidates.push(configured)

  const installDir = getAppInstallDir()
  if (installDir) candidates.push(join(installDir, LIBRARY_PACK_ZIP))

  candidates.push(join(getWanwuDataDirectory(), LIBRARY_PACK_ZIP))

  for (const p of candidates) {
    const key = p.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    if (existsSync(p)) return p
  }
  return null
}

/** @deprecated 使用 discoverLibraryPackZip */
export function getBundledLibraryPackPath(): string | null {
  return discoverLibraryPackZip()
}
