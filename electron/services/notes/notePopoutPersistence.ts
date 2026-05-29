import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { Rectangle } from 'electron'

/** 用户手动关闭/隐藏后，批量「显示全部」不再恢复 */
export type NotePopoutVisibilityOverride = 'user-hidden'

export interface NotePopoutSession {
  bounds: Rectangle
  alwaysOnTop: boolean
  scrollTop: number
  /** 用户通过单条显示/隐藏按钮设置的覆盖；未设置时跟随批量 */
  visibilityOverride?: NotePopoutVisibilityOverride | null
  /** 上次退出时窗口是否仍处于打开状态（含批量隐藏，不含用户手动关闭） */
  lastSessionOpen?: boolean
  /** 上次退出时窗口是否可见 */
  lastSessionVisible?: boolean
}

interface NotePopoutStore {
  version: 1
  byNoteId: Record<string, NotePopoutSession>
}

const FILE_NAME = 'note-popout-sessions.json'

let store: NotePopoutStore | null = null
let dataDir: string | null = null

function filePath(): string {
  if (!dataDir) throw new Error('note popout persistence not initialized')
  return join(dataDir, FILE_NAME)
}

function defaultStore(): NotePopoutStore {
  return { version: 1, byNoteId: {} }
}

function loadStore(): NotePopoutStore {
  if (store) return store
  const path = filePath()
  if (!existsSync(path)) {
    store = defaultStore()
    return store
  }
  try {
    const raw = JSON.parse(readFileSync(path, 'utf-8')) as Partial<NotePopoutStore>
    store = {
      version: 1,
      byNoteId: raw.byNoteId && typeof raw.byNoteId === 'object' ? raw.byNoteId : {}
    }
    return store
  } catch {
    store = defaultStore()
    return store
  }
}

function flushStore(): void {
  if (!store || !dataDir) return
  mkdirSync(dataDir, { recursive: true })
  writeFileSync(filePath(), JSON.stringify(store, null, 2), 'utf-8')
}

function isValidBounds(bounds: Partial<Rectangle> | undefined): bounds is Rectangle {
  return (
    !!bounds &&
    typeof bounds.x === 'number' &&
    typeof bounds.y === 'number' &&
    typeof bounds.width === 'number' &&
    typeof bounds.height === 'number' &&
    bounds.width >= 240 &&
    bounds.height >= 260
  )
}

export function initNotePopoutPersistence(basePath: string): void {
  dataDir = basePath
  store = null
}

function normalizeVisibilityOverride(value: unknown): NotePopoutVisibilityOverride | null {
  if (value === 'user-hidden') return 'user-hidden'
  return null
}

export function isNotePopoutUserDismissed(noteId: string): boolean {
  return getNotePopoutVisibilityOverride(noteId) === 'user-hidden'
}

export function markNotePopoutUserDismissed(noteId: string): void {
  if (!getNotePopoutSession(noteId)) {
    ensureNotePopoutSession(noteId)
  }
  patchNotePopoutSession(noteId, {
    visibilityOverride: 'user-hidden',
    lastSessionOpen: false,
    lastSessionVisible: false
  })
}

export function clearNotePopoutUserDismissed(noteId: string): void {
  if (getNotePopoutVisibilityOverride(noteId) === 'user-hidden') {
    setNotePopoutVisibilityOverride(noteId, null)
  }
}

export function shouldRestorePopoutSession(noteId: string): boolean {
  if (isNotePopoutUserDismissed(noteId)) return false
  const session = loadStore().byNoteId[noteId]
  if (!session || !isValidBounds(session.bounds)) return false
  // 仅当上次明确标记为关闭时不还原；缺失字段的旧数据允许还原
  return session.lastSessionOpen !== false
}

export function getNotePopoutSession(noteId: string): NotePopoutSession | null {
  const session = loadStore().byNoteId[noteId]
  if (!session || !isValidBounds(session.bounds)) return null
  return {
    bounds: session.bounds,
    alwaysOnTop: Boolean(session.alwaysOnTop),
    scrollTop: typeof session.scrollTop === 'number' ? Math.max(0, session.scrollTop) : 0,
    visibilityOverride: normalizeVisibilityOverride(session.visibilityOverride),
    lastSessionOpen: session.lastSessionOpen === true ? true : session.lastSessionOpen === false ? false : undefined,
    lastSessionVisible:
      session.lastSessionVisible === true ? true : session.lastSessionVisible === false ? false : undefined
  }
}

/** 用户曾手动打开过独立窗口的便笺（批量显示/隐藏的作用域） */
export function listNotePopoutScopeIds(): string[] {
  const byNoteId = loadStore().byNoteId
  return Object.keys(byNoteId).filter((noteId) => getNotePopoutSession(noteId) !== null)
}

export function getNotePopoutVisibilityOverride(
  noteId: string
): NotePopoutVisibilityOverride | null {
  return getNotePopoutSession(noteId)?.visibilityOverride ?? null
}

export function setNotePopoutVisibilityOverride(
  noteId: string,
  override: NotePopoutVisibilityOverride | null
): void {
  patchNotePopoutSession(noteId, { visibilityOverride: override })
}

export function ensureNotePopoutSession(
  noteId: string,
  defaults: Partial<Omit<NotePopoutSession, 'visibilityOverride'>> = {}
): NotePopoutSession {
  const current = getNotePopoutSession(noteId)
  if (current) return current
  return patchNotePopoutSession(noteId, {
    bounds: defaults.bounds ?? { x: 0, y: 0, width: 320, height: 360 },
    alwaysOnTop: defaults.alwaysOnTop ?? true,
    scrollTop: defaults.scrollTop ?? 0,
    visibilityOverride: null
  })
}

export function patchNotePopoutSession(
  noteId: string,
  patch: Partial<NotePopoutSession>
): NotePopoutSession {
  const raw = loadStore().byNoteId[noteId]
  const current =
    raw && isValidBounds(raw.bounds) ? getNotePopoutSession(noteId) : null
  const next: NotePopoutSession = {
    bounds: patch.bounds ?? current?.bounds ?? { x: 0, y: 0, width: 320, height: 360 },
    alwaysOnTop: patch.alwaysOnTop ?? current?.alwaysOnTop ?? false,
    scrollTop: patch.scrollTop ?? current?.scrollTop ?? 0,
    visibilityOverride:
      patch.visibilityOverride !== undefined
        ? patch.visibilityOverride
        : (current?.visibilityOverride ?? null),
    lastSessionOpen:
      patch.lastSessionOpen !== undefined ? patch.lastSessionOpen : current?.lastSessionOpen,
    lastSessionVisible:
      patch.lastSessionVisible !== undefined ? patch.lastSessionVisible : current?.lastSessionVisible
  }
  loadStore().byNoteId[noteId] = next
  flushStore()
  return next
}
