import { existsSync } from 'fs'
import { join } from 'path'
import { getBundledAssetsRoot } from '../core/assetsRoot'

/** 种子配置目录（开发：仓库 assets/seed/library；打包：resources/assets/seed/library） */
export function getLibrarySeedRoot(): string {
  return join(getBundledAssetsRoot(), 'seed', 'library')
}

export function getLibraryCategoriesPath(): string {
  return join(getLibrarySeedRoot(), 'categories.json')
}

export function getLibraryCatalogPath(): string {
  return join(getLibrarySeedRoot(), 'catalog.json')
}

export const LIBRARY_PACK_ZIP = 'library-data-pack.zip'

/** 构建产物：assets/packed */
export function getLibraryPackedDir(): string {
  return join(getBundledAssetsRoot(), 'packed')
}

/** 预编译图鉴库数据包 zip */
export function getBundledLibraryPackPath(): string | null {
  const p = join(getLibraryPackedDir(), LIBRARY_PACK_ZIP)
  return existsSync(p) ? p : null
}
