/**
 * 安装程序在安装阶段调用：将 library-data-pack.zip 解压到用户数据目录。
 * 通过 Wanwu.exe --installer-import-library-pack "<dataDir>" ["<zipPath>"] 触发。
 */
import { existsSync, mkdirSync, rmSync } from 'fs'
import { join, normalize, resolve } from 'path'
import {
  applyBundledLibraryPack,
  ensureBundledLibraryMediaInstalled,
  isLibraryPackUpToDate,
  readManifestFromZip
} from './pack'
import { LIBRARY_PACK_ZIP } from './paths'
import { patchWanwuPathConfig } from '../data/paths'

export interface InstallerLibraryImportResult {
  ok: boolean
  /** 无 zip 时 skipped；成功 imported；已是最新 skipped-up-to-date */
  status: 'none' | 'installed' | 'skipped' | 'failed'
  message: string
}

function tryDeleteZip(zipPath: string): boolean {
  try {
    rmSync(zipPath, { force: true })
    return !existsSync(zipPath)
  } catch {
    return false
  }
}

export async function runInstallerLibraryPackImport(
  rawDataPath: string,
  rawZipPath?: string
): Promise<InstallerLibraryImportResult> {
  const dataPath = normalize(resolve(rawDataPath.trim()))
  if (!dataPath) {
    return { ok: false, status: 'failed', message: '数据目录无效' }
  }

  mkdirSync(dataPath, { recursive: true })
  for (const sub of ['db', 'media', 'cache', 'resources']) {
    mkdirSync(join(dataPath, sub), { recursive: true })
  }

  const zipPath = normalize(
    resolve((rawZipPath?.trim() || join(dataPath, LIBRARY_PACK_ZIP)).trim())
  )

  if (!existsSync(zipPath)) {
    patchWanwuPathConfig({ wanwuPath: dataPath, libraryPackPath: '' })
    return { ok: true, status: 'none', message: '未指定图鉴包，已应用数据目录' }
  }

  const manifest = await readManifestFromZip(zipPath)
  if (!manifest) {
    return {
      ok: false,
      status: 'failed',
      message: `图鉴数据包无效（缺少 manifest.json）：${zipPath}`
    }
  }

  if (isLibraryPackUpToDate(dataPath, manifest)) {
    if (tryDeleteZip(zipPath)) {
      patchWanwuPathConfig({ wanwuPath: dataPath, libraryPackPath: '' })
    }
    return { ok: true, status: 'skipped', message: '图鉴数据已是最新' }
  }

  try {
    await applyBundledLibraryPack(dataPath, zipPath, manifest)
    await ensureBundledLibraryMediaInstalled(zipPath, dataPath)
    if (!tryDeleteZip(zipPath)) {
      return {
        ok: true,
        status: 'installed',
        message: `图鉴已导入，但无法删除 ${LIBRARY_PACK_ZIP}（请手动删除）`
      }
    }
    patchWanwuPathConfig({ wanwuPath: dataPath, libraryPackPath: '' })
    return { ok: true, status: 'installed', message: '图鉴资源导入完成' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    patchWanwuPathConfig({ wanwuPath: dataPath, libraryPackPath: zipPath })
    return {
      ok: false,
      status: 'failed',
      message: `图鉴导入失败：${message}`
    }
  }
}
