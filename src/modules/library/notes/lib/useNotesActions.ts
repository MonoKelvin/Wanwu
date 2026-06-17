/**
 * UI 层便笺操作：封装命令总线 + toast/confirm，供视图与编辑器共用。
 */
import {
  getNoteCommandBus,
  NoteCmd,
  type NoteCommandEnvelope,
  type NoteCommandResult
} from '@modules/library/notes/app/command'
import type { NoteColor } from '@modules/library/notes/domain/types'
import { useWanwuConfirm } from '@shared/composables/useWanwuConfirm'
import { useWanwuToast } from '@shared/composables/useWanwuToast'

interface UseNotesActionsOptions {
  /** 变更 store 前同步 Tiptap → 草稿 */
  beforeMutate?: () => void | Promise<void>
}

export function useNotesActions(options: UseNotesActionsOptions = {}) {
  const bus = getNoteCommandBus()
  const confirm = useWanwuConfirm()
  const toast = useWanwuToast()

  async function dispatch<T = unknown>(
    envelope: NoteCommandEnvelope,
    errorMessage: string
  ): Promise<NoteCommandResult<T>> {
    try {
      await options.beforeMutate?.()
      const result = (await bus.dispatch(envelope)) as NoteCommandResult<T>
      if (!result.ok) {
        toast.error(result.message || errorMessage)
      }
      return result
    } catch {
      toast.error(errorMessage)
      return { ok: false, code: 'INTERNAL', message: errorMessage }
    }
  }

  async function loadAll() {
    return dispatch({ type: NoteCmd.LoadAll, source: 'ui' }, '加载便笺失败')
  }

  async function createNote(payload?: { color?: NoteColor }) {
    return dispatch({ type: NoteCmd.Create, payload, source: 'ui' }, '创建便笺失败')
  }

  async function deleteNote(
    noteId: string,
    opts?: { confirm?: boolean; header?: string; message?: string }
  ) {
    if (opts?.confirm !== false) {
      const ok = await confirm.ask({
        header: opts?.header ?? '删除便笺',
        message: opts?.message ?? '删除后无法恢复，确定删除这张便笺吗？',
        acceptLabel: '删除',
        danger: true
      })
      if (!ok) return { ok: false as const, code: 'CANCELLED', message: '已取消' }
    }
    return dispatch({ type: NoteCmd.Delete, payload: { noteId }, source: 'ui' }, '删除便笺失败')
  }

  async function togglePinned(noteId: string) {
    return dispatch(
      { type: NoteCmd.TogglePinned, payload: { noteId }, source: 'ui' },
      '更新置顶状态失败'
    )
  }

  async function setColor(noteId: string, color: NoteColor) {
    return dispatch(
      { type: NoteCmd.SetColor, payload: { noteId, color }, source: 'ui' },
      '更新颜色失败'
    )
  }

  async function selectNote(noteId: string | null) {
    return dispatch({ type: NoteCmd.Select, payload: { noteId }, source: 'ui' }, '选中便笺失败')
  }

  async function addImage(noteId: string, filePath: string) {
    return dispatch(
      { type: NoteCmd.AddImage, payload: { noteId, filePath }, source: 'ui' },
      '添加图片失败'
    )
  }

  async function removeImage(imageId: string) {
    return dispatch(
      { type: NoteCmd.RemoveImage, payload: { imageId }, source: 'ui' },
      '删除图片失败'
    )
  }

  async function copyContent(noteId: string) {
    const result = await dispatch<{ text: string }>(
      { type: NoteCmd.CopyContent, payload: { noteId }, source: 'ui' },
      '复制失败'
    )
    if (result.ok) {
      toast.success('已复制便笺内容')
    }
    return result
  }

  async function updateNote(
    noteId: string,
    patch: {
      title?: string
      content?: string
      color?: NoteColor
      pinned?: boolean
      touchUpdatedAt?: boolean
      syncEditor?: 'auto' | 'force' | false
    }
  ) {
    return dispatch(
      { type: NoteCmd.Update, payload: { noteId, ...patch }, source: 'ui' },
      '更新便笺失败'
    )
  }

  return {
    dispatch,
    loadAll,
    createNote,
    deleteNote,
    togglePinned,
    setColor,
    selectNote,
    addImage,
    removeImage,
    copyContent,
    updateNote
  }
}

interface UseNoteEditorActionsOptions {
  getNoteId: () => string | null | undefined
  syncDraft?: () => void
}

/** 编辑器内操作：置顶、颜色、图片（主界面与独立窗口共用） */
export function useNoteEditorActions(options: UseNoteEditorActionsOptions) {
  const actions = useNotesActions({ beforeMutate: options.syncDraft })

  function requireNoteId(): string | null {
    return options.getNoteId() || null
  }

  return {
    togglePinned: async () => {
      const noteId = requireNoteId()
      if (noteId) await actions.togglePinned(noteId)
    },
    setColor: async (color: NoteColor) => {
      const noteId = requireNoteId()
      if (noteId) await actions.setColor(noteId, color)
    },
    pickImage: async () => {
      const noteId = requireNoteId()
      if (!noteId) return
      const picked = await window.wanwu.shell.pickImageFile()
      if (!picked.ok || !picked.path) return
      await actions.addImage(noteId, picked.path)
    },
    insertImageByPath: async (filePath: string) => {
      const noteId = requireNoteId()
      if (noteId && filePath) await actions.addImage(noteId, filePath)
    }
  }
}
