import type { NoteItem } from '@shared/types/notes'

/** 便笺列表排序：置顶优先，置顶内保持原序，其余按更新时间倒序 */
export function sortNotesList(notes: readonly NoteItem[]): NoteItem[] {
  const order = new Map<string, number>()
  notes.forEach((note, index) => order.set(note.id, index))
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    if (a.pinned && b.pinned) {
      return (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}
