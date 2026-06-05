import type { IDiagramCommandHandler } from '@modules/library/diagrams/interfaces/IDiagramCommandHandler'
import type {
  DiagramCommandContext,
  DiagramCommandEnvelope,
  DiagramCommandResult
} from '@modules/library/diagrams/domain/commands/types'
import type { IDiagramRepositoryPort } from '@modules/library/diagrams/interfaces/IDiagramRepositoryPort'
import { diagramError } from '@modules/library/diagrams/app/diagramCommandErrors'

export class FolderCommandHandler implements IDiagramCommandHandler {
  readonly domain = 'folder' as const

  constructor(private readonly repo: IDiagramRepositoryPort) {}

  canHandle(type: string): boolean {
    return type.startsWith('folder.')
  }

  async execute(cmd: DiagramCommandEnvelope, _ctx: DiagramCommandContext): Promise<DiagramCommandResult> {
    const p = cmd.payload ?? {}
    try {
      switch (cmd.type) {
        case 'folder.list':
          return { ok: true, data: await this.repo.listFolders() }
        case 'folder.create':
          return { ok: true, data: await this.repo.createFolder(p.name as string) }
        case 'folder.rename':
          await this.repo.renameFolder(p.folderId as string, p.name as string)
          return { ok: true }
        case 'folder.delete':
          await this.repo.deleteFolder(p.folderId as string)
          return { ok: true }
        case 'folder.reorder':
          await this.repo.reorderFolders(
            p.orders as Array<{ folderId: string; sortOrder: number }>
          )
          return { ok: true }
        default:
          return diagramError('UNKNOWN_COMMAND', `未支持的分组命令: ${cmd.type}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return diagramError('INTERNAL', message)
    }
  }
}
