import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join, normalize, resolve } from 'path'
import { ELECTRON_USER_DATA_FOLDER, getElectronPath } from '../core/electronRuntime'

const CONFIG_FILE = 'wanwu-path.json'

export { ELECTRON_USER_DATA_FOLDER }

export interface WanwuPathConfig {
  wanwuPath?: string
  /** 图鉴数据包 zip（安装程序或用户指定） */
  libraryPackPath?: string
}

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
  return join(getWanwuDataDirectory(), 'resources')
}

/** 当前生效的万物数据目录，并确保 db / media / cache / resources 子目录存在 */
export function resolveWanwuPath(): string {
  const target = getWanwuDataDirectory()
  mkdirSync(target, { recursive: true })
  for (const sub of ['db', 'media', 'cache', 'resources']) {
    mkdirSync(join(target, sub), { recursive: true })
  }
  return target
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

/** 迁移/安装时使用的数据目录（与所选目录一致，不再追加 wanwu 子目录） */
export function resolveWanwuPathUnderParent(parentDir: string): string {
  return normalize(resolve(parentDir))
}

export function validateMigrationTarget(
  currentPath: string,
  targetParentDir: string
): { ok: true; targetPath: string } | { ok: false; error: string } {
  const current = normalize(resolve(currentPath))
  const parent = normalize(resolve(targetParentDir))
  const target = resolveWanwuPathUnderParent(parent)

  if (parent === current) {
    return { ok: false, error: '请选择新的数据目录，而非当前数据目录本身' }
  }

  if (target === current) {
    return { ok: false, error: '目标路径与当前数据目录相同' }
  }

  const currentLower = current.toLowerCase()
  const targetLower = target.toLowerCase()
  if (targetLower.startsWith(`${currentLower}\\`) || targetLower.startsWith(`${currentLower}/`)) {
    return { ok: false, error: '目标目录不能位于当前数据目录内部' }
  }
  if (currentLower.startsWith(`${targetLower}\\`) || currentLower.startsWith(`${targetLower}/`)) {
    return { ok: false, error: '目标目录不能包含当前数据目录' }
  }

  return { ok: true, targetPath: target }
}
