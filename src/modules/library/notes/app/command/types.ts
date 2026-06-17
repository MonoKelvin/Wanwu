/**
 * 便笺命令层类型定义：命令 ID、载荷、信封与结果。
 * UI / 脚本 / MCP 通过 bus.dispatch({ type, payload }) 调用。
 */
import type { CommandMeta } from '@app/command'
import type { NoteColor } from '@shared/types/notes'

// ── 命令 ID ──────────────────────────────────────────────

export const NoteCmd = {
  LoadAll: 'notes.loadAll',
  Create: 'notes.create',
  Delete: 'notes.delete',
  Update: 'notes.update',
  TogglePinned: 'notes.togglePinned',
  SetColor: 'notes.setColor',
  Select: 'notes.select',
  AddImage: 'notes.addImage',
  RemoveImage: 'notes.removeImage',
  CopyContent: 'notes.copyContent'
} as const

export type NoteCommandId = (typeof NoteCmd)[keyof typeof NoteCmd]

export const ALL_NOTE_COMMAND_IDS: readonly NoteCommandId[] = Object.values(NoteCmd)

export function isNoteCommandId(type: string): type is NoteCommandId {
  return (ALL_NOTE_COMMAND_IDS as readonly string[]).includes(type)
}

export function noteCommandTitle(id: NoteCommandId): string {
  switch (id) {
    case NoteCmd.LoadAll:
      return '加载便笺列表'
    case NoteCmd.Create:
      return '新建便笺'
    case NoteCmd.Delete:
      return '删除便笺'
    case NoteCmd.Update:
      return '更新便笺'
    case NoteCmd.TogglePinned:
      return '切换置顶'
    case NoteCmd.SetColor:
      return '设置颜色'
    case NoteCmd.Select:
      return '选中便笺'
    case NoteCmd.AddImage:
      return '添加图片'
    case NoteCmd.RemoveImage:
      return '删除图片'
    case NoteCmd.CopyContent:
      return '复制便笺内容'
    default:
      return id
  }
}

export function noteCommandCategory(id: NoteCommandId): string {
  if (id === NoteCmd.LoadAll || id === NoteCmd.Select) return '浏览'
  if (id === NoteCmd.CopyContent) return '剪贴板'
  if (id === NoteCmd.AddImage || id === NoteCmd.RemoveImage) return '图片'
  return '便笺'
}

// ── 载荷 ────────────────────────────────────────────────

export interface NoteCreatePayload {
  color?: NoteColor
  title?: string
  content?: string
  pinned?: boolean
  /** 默认 true：新建后选中 */
  select?: boolean
}

export interface NoteDeletePayload {
  noteId: string
}

export interface NoteUpdatePayload {
  noteId: string
  title?: string
  content?: string
  color?: NoteColor
  pinned?: boolean
  touchUpdatedAt?: boolean
  /**
   * 更新成功后同步到正在编辑的 UI。
   * - `auto`（默认）：仅当本地草稿无未保存编辑时覆盖
   * - `force`：强制覆盖本地草稿与编辑器
   * - `false`：仅写 store，不推送编辑器
   */
  syncEditor?: 'auto' | 'force' | false
}

export interface NoteTogglePinnedPayload {
  noteId: string
}

export interface NoteSetColorPayload {
  noteId: string
  color: NoteColor
}

export interface NoteSelectPayload {
  noteId: string | null
}

export interface NoteAddImagePayload {
  noteId: string
  filePath: string
}

export interface NoteRemoveImagePayload {
  imageId: string
}

export interface NoteCopyContentPayload {
  noteId: string
}

// ── 信封与结果 ──────────────────────────────────────────

export type NoteCommandResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; code: string; message: string }

export interface NoteCommandEnvelope {
  readonly type: NoteCommandId
  readonly payload?: unknown
  readonly source?: CommandMeta['source']
}

export function noteOk<T>(data?: T): NoteCommandResult<T> {
  return { ok: true, data }
}

export function noteFail(code: string, message: string): NoteCommandResult {
  return { ok: false, code, message }
}
