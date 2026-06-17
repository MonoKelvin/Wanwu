/** 注册便笺命令到全局 CommandCatalog（命令控制台 / MCP 发现用） */
import type { ICommandContributor } from '@app/command'
import {
  ALL_NOTE_COMMAND_IDS,
  noteCommandCategory,
  noteCommandTitle
} from '@modules/library/notes/app/command/types'

export const notesCommandContributor: ICommandContributor = {
  id: 'wanwu.notes',
  contribute({ catalog }) {
    for (const type of ALL_NOTE_COMMAND_IDS) {
      catalog.register({
        type,
        title: noteCommandTitle(type),
        category: noteCommandCategory(type)
      })
    }
  }
}
