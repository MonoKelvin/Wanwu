import { join, normalize, resolve } from 'node:path'

/** 万物数据根目录下的一级子目录（备份/迁移会整包复制 root） */
export const WANWU_DATA_SUBDIRS = ['db', 'media', 'cache', 'resources', 'music'] as const

export interface WanwuPathConfig {
  wanwuPath?: string
  /** 图鉴数据包 zip（安装程序或用户指定） */
  libraryPackPath?: string
}

/** 相对万物数据根的路径布局（框架通用字段；模块库路径见各模块 *Paths.ts） */
export interface WanwuPathLayout {
  root: string
  db: string
  media: string
  cache: string
  resources: string
  music: string
  userDbFile: string
  notePopoutSessionsFile: string
  windowStateFile: string
}

export function buildWanwuPathLayout(root: string): WanwuPathLayout {
  const normalizedRoot = normalize(resolve(root))
  return {
    root: normalizedRoot,
    db: join(normalizedRoot, 'db'),
    media: join(normalizedRoot, 'media'),
    cache: join(normalizedRoot, 'cache'),
    resources: join(normalizedRoot, 'resources'),
    music: join(normalizedRoot, 'music'),
    userDbFile: join(normalizedRoot, 'db', 'user.sqlite'),
    notePopoutSessionsFile: join(normalizedRoot, 'note-popout-sessions.json'),
    windowStateFile: join(normalizedRoot, 'window-state.json')
  }
}

/** db 目录下的标记文件（图鉴包版本等） */
export function wanwuDbMarkerFile(layout: WanwuPathLayout, markerName: string): string {
  return join(layout.db, markerName)
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
