import type { ICommand, CommandMeta, ICommandContributor } from '@app/command'
import type { DiagramCommandEnvelope } from '@modules/library/diagrams/app/command/domain/types'
import {
  ALL_DIAGRAM_COMMAND_IDS,
  diagramCommandCategory,
  diagramCommandTitle,
  type DiagramCommandId
} from '@modules/library/diagrams/app/command/domain/ids'

export function diagramEnvelopeToCommand(
  cmd: DiagramCommandEnvelope,
  source: CommandMeta['source'] = 'ui'
): ICommand {
  return {
    meta: {
      name: diagramCommandTitle(cmd.type as DiagramCommandId),
      type: cmd.type,
      issuedAt: new Date().toISOString(),
      source
    },
    payload: cmd.payload ?? {}
  }
}

export const diagramsCommandContributor: ICommandContributor = {
  id: 'wanwu.diagrams',
  contribute({ catalog }) {
    for (const type of ALL_DIAGRAM_COMMAND_IDS) {
      catalog.register({
        type,
        title: diagramCommandTitle(type),
        category: diagramCommandCategory(type)
      })
    }
  }
}
