import { existsSync, readdirSync } from 'fs'
import { dirname, join } from 'path'
import { getWanwuDataDirectory, readWanwuPathConfig } from '../data/paths'
import { getBundledAssetsRoot } from '../core/assetsRoot'
import { isElectronPackaged } from '../core/electronRuntime'

/** 图鉴种子根目录 assets/seed/illustrated-handbook */
export function getIllustratedHandbookSeedRoot(): string {
  return join(getBundledAssetsRoot(), 'seed', 'illustrated-handbook')
}

/** 图鉴配图目录名（zip / wanwu-media / 用户 resources 下的相对路径前缀） */
export const ILLUSTRATED_HANDBOOK_MEDIA_DIR = 'illustrated-handbook'

/** 仓库内图鉴配图根目录 assets/seed/illustrated-handbook/resources */
export function getIllustratedHandbookResourcesRoot(): string {
  return join(getIllustratedHandbookSeedRoot(), 'resources')
}

export function getIllustratedHandbookBundledMediaRoot(): string {
  return getIllustratedHandbookResourcesRoot()
}

/** @deprecated 使用 getIllustratedHandbookSeedRoot */
export function getLibrarySeedRoot(): string {
  return getIllustratedHandbookSeedRoot()
}

export function getLibraryItemsDir(): string {
  return join(getIllustratedHandbookSeedRoot(), 'items')
}

function hasAnySeedItemJson(dir: string): boolean {
  if (!existsSync(dir)) return false
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, ent.name)
    if (ent.isDirectory()) {
      if (hasAnySeedItemJson(abs)) return true
      continue
    }
    if (ent.isFile() && ent.name.endsWith('.json') && !ent.name.startsWith('_')) return true
  }
  return false
}

export function isBundledLibrarySeedAvailable(): boolean {
  return hasAnySeedItemJson(getLibraryItemsDir())
}

export function getLibraryCategoriesPath(): string {
  return join(getIllustratedHandbookSeedRoot(), 'categories.json')
}

/** @deprecated 图鉴种子已改为 items 目录独立 JSON，不再使用 catalog.json */
export function getLibraryCatalogPath(): string {
  return join(getIllustratedHandbookSeedRoot(), 'catalog.json')
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
