/**
 * 便笺数据命令实现：CRUD、置顶、颜色、图片、复制等。
 */
import {
  NoteAppCommandBase,
  createNoteCommandRegistry,
  type NoteCommandExecutionContext,
  type NoteCommandRegistry
} from '@modules/library/notes/app/command/registry'
import {
  NoteCmd,
  noteFail,
  noteOk,
  type NoteAddImagePayload,
  type NoteCopyContentPayload,
  type NoteCreatePayload,
  type NoteDeletePayload,
  type NoteRemoveImagePayload,
  type NoteSelectPayload,
  type NoteSetColorPayload,
  type NoteTogglePinnedPayload,
  type NoteUpdatePayload
} from '@modules/library/notes/app/command/types'
import { normalizeNotePlainText } from '@modules/library/notes/lib/noteContentText'
import { notifyNoteEditorSync } from '@modules/library/notes/lib/noteEditorSync'

function noteTitle(note: { title: string }) {
  return note.title.trim() || '未命名便笺'
}

class LoadAllNotesCommand extends NoteAppCommandBase {
  readonly id = NoteCmd.LoadAll
  readonly title = '加载便笺列表'

  async execute(_params: unknown, ctx: NoteCommandExecutionContext) {
    const notes = await ctx.repo.loadAll()
    return noteOk({ notes })
  }
}

class CreateNoteCommand extends NoteAppCommandBase {
  readonly id = NoteCmd.Create
  readonly title = '新建便笺'

  async execute(params: unknown, ctx: NoteCommandExecutionContext) {
    const payload = this.castParams<NoteCreatePayload>(params)
    const created = await ctx.repo.createNote({
      color: payload.color,
      title: payload.title,
      content: payload.content,
      pinned: payload.pinned
    })
    if (payload.select !== false) {
      ctx.repo.setSelected(created.id)
    }
    return noteOk({ note: created })
  }
}

class DeleteNoteCommand extends NoteAppCommandBase {
  readonly id = NoteCmd.Delete
  readonly title = '删除便笺'

  async execute(params: unknown, ctx: NoteCommandExecutionContext) {
    const { noteId } = this.castParams<NoteDeletePayload>(params)
    if (!noteId) return noteFail('VALIDATION', '缺少 noteId')
    if (!ctx.repo.findNote(noteId)) return noteFail('NOT_FOUND', '便笺不存在')
    const ok = await ctx.repo.deleteNote(noteId)
    if (!ok) return noteFail('INTERNAL', '删除便笺失败')
    return noteOk({ noteId })
  }
}

class UpdateNoteCommand extends NoteAppCommandBase {
  readonly id = NoteCmd.Update
  readonly title = '更新便笺'

  async execute(params: unknown, ctx: NoteCommandExecutionContext) {
    const payload = this.castParams<NoteUpdatePayload>(params)
    if (!payload.noteId) return noteFail('VALIDATION', '缺少 noteId')
    if (!ctx.repo.findNote(payload.noteId)) return noteFail('NOT_FOUND', '便笺不存在')
    const updated = await ctx.repo.updateNote(payload.noteId, {
      title: payload.title,
      content: payload.content,
      color: payload.color,
      pinned: payload.pinned,
      touchUpdatedAt: payload.touchUpdatedAt
    })
    if (!updated) return noteFail('INTERNAL', '更新便笺失败')
    if (payload.syncEditor !== false) {
      notifyNoteEditorSync(payload.noteId, { force: payload.syncEditor === 'force' })
    }
    return noteOk({ note: updated })
  }
}

class TogglePinnedCommand extends NoteAppCommandBase {
  readonly id = NoteCmd.TogglePinned
  readonly title = '切换置顶'

  async execute(params: unknown, ctx: NoteCommandExecutionContext) {
    const { noteId } = this.castParams<NoteTogglePinnedPayload>(params)
    if (!noteId) return noteFail('VALIDATION', '缺少 noteId')
    const note = ctx.repo.findNote(noteId)
    if (!note) return noteFail('NOT_FOUND', '便笺不存在')
    const updated = await ctx.repo.updateNote(noteId, { pinned: !note.pinned })
    if (!updated) return noteFail('INTERNAL', '更新置顶状态失败')
    return noteOk({ note: updated })
  }
}

class SetColorCommand extends NoteAppCommandBase {
  readonly id = NoteCmd.SetColor
  readonly title = '设置颜色'

  async execute(params: unknown, ctx: NoteCommandExecutionContext) {
    const { noteId, color } = this.castParams<NoteSetColorPayload>(params)
    if (!noteId || !color) return noteFail('VALIDATION', '缺少 noteId 或 color')
    const note = ctx.repo.findNote(noteId)
    if (!note) return noteFail('NOT_FOUND', '便笺不存在')
    if (note.color === color) return noteOk({ note })
    const updated = await ctx.repo.updateNote(noteId, { color })
    if (!updated) return noteFail('INTERNAL', '更新颜色失败')
    return noteOk({ note: updated })
  }
}

class SelectNoteCommand extends NoteAppCommandBase {
  readonly id = NoteCmd.Select
  readonly title = '选中便笺'

  async execute(params: unknown, ctx: NoteCommandExecutionContext) {
    const { noteId } = this.castParams<NoteSelectPayload>(params)
    if (noteId && !ctx.repo.findNote(noteId)) {
      return noteFail('NOT_FOUND', '便笺不存在')
    }
    ctx.repo.setSelected(noteId)
    return noteOk({ noteId })
  }
}

class AddImageCommand extends NoteAppCommandBase {
  readonly id = NoteCmd.AddImage
  readonly title = '添加图片'

  async execute(params: unknown, ctx: NoteCommandExecutionContext) {
    const { noteId, filePath } = this.castParams<NoteAddImagePayload>(params)
    if (!noteId || !filePath) return noteFail('VALIDATION', '缺少 noteId 或 filePath')
    if (!ctx.repo.findNote(noteId)) return noteFail('NOT_FOUND', '便笺不存在')
    const image = await ctx.repo.addImage(noteId, filePath)
    return noteOk({ image })
  }
}

class RemoveImageCommand extends NoteAppCommandBase {
  readonly id = NoteCmd.RemoveImage
  readonly title = '删除图片'

  async execute(params: unknown, ctx: NoteCommandExecutionContext) {
    const { imageId } = this.castParams<NoteRemoveImagePayload>(params)
    if (!imageId) return noteFail('VALIDATION', '缺少 imageId')
    const ok = await ctx.repo.removeImage(imageId)
    if (!ok) return noteFail('INTERNAL', '删除图片失败')
    return noteOk({ imageId })
  }
}

class CopyContentCommand extends NoteAppCommandBase {
  readonly id = NoteCmd.CopyContent
  readonly title = '复制便笺内容'

  async execute(params: unknown, ctx: NoteCommandExecutionContext) {
    const { noteId } = this.castParams<NoteCopyContentPayload>(params)
    if (!noteId) return noteFail('VALIDATION', '缺少 noteId')
    const note = ctx.repo.findNote(noteId)
    if (!note) return noteFail('NOT_FOUND', '便笺不存在')
    const text = `${noteTitle(note)}\n\n${normalizeNotePlainText(note.content || '')}`.trim()
    try {
      await window.wanwu.shell.copyText(text)
    } catch {
      return noteFail('INTERNAL', '复制失败')
    }
    return noteOk({ text })
  }
}

/** 注册全部便笺数据命令 */
export function registerNoteCommands(registry: NoteCommandRegistry): void {
  registry
    .registerSingleton(new LoadAllNotesCommand())
    .registerSingleton(new CreateNoteCommand())
    .registerSingleton(new DeleteNoteCommand())
    .registerSingleton(new UpdateNoteCommand())
    .registerSingleton(new TogglePinnedCommand())
    .registerSingleton(new SetColorCommand())
    .registerSingleton(new SelectNoteCommand())
    .registerSingleton(new AddImageCommand())
    .registerSingleton(new RemoveImageCommand())
    .registerSingleton(new CopyContentCommand())
}

/** 创建已注册全部命令的注册表 */
export function createRegisteredNoteCommandRegistry(): NoteCommandRegistry {
  const registry = createNoteCommandRegistry()
  registerNoteCommands(registry)
  return registry
}
