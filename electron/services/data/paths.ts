import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join, normalize, resolve } from 'path'
import { ELECTRON_USER_DATA_FOLDER, getElectronPath } from '../core/electronRuntime'
import {
  WANWU_DATA_SUBDIRS,
  buildWanwuPathLayout,
  resolveWanwuPathUnderParent,
  validateMigrationTarget,
  type WanwuPathConfig,
  type WanwuPathLayout
} from '@shared/lib/wanwuPaths'

const CONFIG_FILE = 'wanwu-path.json'

export { ELECTRON_USER_DATA_FOLDER }
export {
  WANWU_DATA_SUBDIRS,
  buildWanwuPathLayout,
  resolveWanwuPathUnderParent,
  validateMigrationTarget,
  wanwuDbMarkerFile,
  type WanwuPathConfig,
  type WanwuPathLayout
} from '@shared/lib/wanwuPaths'

function parseConfigFile(file: string): WanwuPathConfig {
  if (!existsSync(file)) return {}
  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as WanwuPathConfig
  } catch {
    return {}
  }
}

/** 可能存放 wanwu-path.json 的位置（含安装程序历史路径） */
function listConfigFileCandidates(): string[] {
  const primary = join(getElectronPath('userData'), CONFIG_FILE)
  const appData = getElectronPath('appData')
  const legacy = [
    join(appData, ELECTRON_USER_DATA_FOLDER, CONFIG_FILE),
    join(appData, 'Wanwu', CONFIG_FILE)
  ]
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of [primary, ...legacy]) {
    const key = p.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p)
  }
  return out
}

export function getConfigFilePath(): string {
  return join(getElectronPath('userData'), CONFIG_FILE)
}

export function getDefaultWanwuPath(): string {
  return getElectronPath('userData')
}

export function readWanwuPathConfig(): WanwuPathConfig {
  const primary = getConfigFilePath()
  if (existsSync(primary)) {
    return parseConfigFile(primary)
  }

  const candidates = listConfigFileCandidates()
  for (const file of candidates.slice(1)) {
    if (!existsSync(file)) continue
    try {
      mkdirSync(dirname(primary), { recursive: true })
      writeFileSync(primary, readFileSync(file, 'utf-8'), 'utf-8')
      return parseConfigFile(primary)
    } catch {
      return parseConfigFile(file)
    }
  }

  return {}
}

function writeWanwuPathConfigFile(config: WanwuPathConfig): void {
  const userData = getElectronPath('userData')
  mkdirSync(userData, { recursive: true })

  const payload: WanwuPathConfig = {}
  const wanwuPath = config.wanwuPath?.trim()
  if (wanwuPath) payload.wanwuPath = normalize(resolve(wanwuPath))

  const libraryPackPath = config.libraryPackPath?.trim()
  if (libraryPackPath) payload.libraryPackPath = normalize(resolve(libraryPackPath))

  writeFileSync(getConfigFilePath(), `${JSON.stringify(payload, null, 2)}\n`, 'utf-8')
}

/** 配置中的万物数据目录（不创建磁盘目录） */
export function getWanwuDataDirectory(): string {
  const configured = readWanwuPathConfig().wanwuPath?.trim()
  return configured ? normalize(resolve(configured)) : normalize(getDefaultWanwuPath())
}

/** 用户数据目录下的资源目录（图鉴配图等） */
export function getWanwuResourcesDirectory(): string {
  return getWanwuPathLayout().resources
}

export function getWanwuPathLayout(basePath?: string): WanwuPathLayout {
  const root = basePath ? normalize(resolve(basePath)) : getWanwuDataDirectory()
  return buildWanwuPathLayout(root)
}

/** 确保万物数据目录及标准子目录存在（写文件前应使用 layout.root 或 resolveWanwuPath） */
export function ensureWanwuDataLayout(basePath?: string): string {
  const layout = getWanwuPathLayout(basePath)
  mkdirSync(layout.root, { recursive: true })
  for (const sub of WANWU_DATA_SUBDIRS) {
    mkdirSync(join(layout.root, sub), { recursive: true })
  }
  return layout.root
}

/** 当前生效的万物数据目录（配置项 wanwu-path.json → wanwuPath） */
export function resolveWanwuPath(): string {
  return ensureWanwuDataLayout()
}

export function isCustomWanwuPath(): boolean {
  const configured = readWanwuPathConfig().wanwuPath?.trim()
  if (!configured) return false
  return normalize(resolve(configured)) !== normalize(getDefaultWanwuPath())
}

export function writeWanwuPathConfig(wanwuPath: string): void {
  const existing = readWanwuPathConfig()
  writeWanwuPathConfigFile({ ...existing, wanwuPath })
}

export function patchWanwuPathConfig(patch: Partial<WanwuPathConfig>): void {
  const existing = readWanwuPathConfig()
  const next: WanwuPathConfig = { ...existing, ...patch }
  if (patch.libraryPackPath === '') delete next.libraryPackPath
  writeWanwuPathConfigFile(next)
}
