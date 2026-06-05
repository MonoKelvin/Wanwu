import type { IDiagramCommandHandler } from '@modules/library/diagrams/interfaces/IDiagramCommandHandler'
import type {
  DiagramCommandContext,
  DiagramCommandEnvelope,
  DiagramCommandResult
} from '@modules/library/diagrams/domain/commands/types'
import type { IDiagramRepositoryPort } from '@modules/library/diagrams/interfaces/IDiagramRepositoryPort'
import { diagramError } from '@modules/library/diagrams/app/diagramCommandErrors'
import type { DiagramContent } from '@shared/types/diagrams'

export class FileCommandHandler implements IDiagramCommandHandler {
  readonly domain = 'file' as const

  constructor(private readonly repo: IDiagramRepositoryPort) {}

  canHandle(type: string): boolean {
    return type.startsWith('file.')
  }

  async execute(cmd: DiagramCommandEnvelope, _ctx: DiagramCommandContext): Promise<DiagramCommandResult> {
    const p = cmd.payload ?? {}
    try {
      switch (cmd.type) {
        case 'file.list':
          return { ok: true, data: await this.repo.listFiles(p.folderId as string) }
        case 'file.create':
          return {
            ok: true,
            data: await this.repo.createFile(
              p.folderId as string,
              p.title as string,
              p.content as DiagramContent | undefined
            )
          }
        case 'file.read': {
          const record = await this.repo.readFile(p.fileId as string)
          if (!record) return diagramError('NOT_FOUND', '文件不存在')
          return { ok: true, data: record }
        }
        case 'file.rename': {
          const meta = await this.repo.renameFile(p.fileId as string, p.title as string)
          if (!meta) return diagramError('NOT_FOUND', '文件不存在')
          return { ok: true, data: meta }
        }
        case 'file.move': {
          const meta = await this.repo.moveFile(p.fileId as string, p.folderId as string)
          if (!meta) return diagramError('NOT_FOUND', '文件不存在')
          return { ok: true, data: meta }
        }
        case 'file.softDelete':
          await this.repo.softDeleteFile(p.fileId as string)
          return { ok: true }
        case 'file.restore':
          await this.repo.restoreFile(p.fileId as string)
          return { ok: true }
        case 'file.purge':
          await this.repo.purgeFile(p.fileId as string)
          return { ok: true }
        default:
          return diagramError('UNKNOWN_COMMAND', `未支持的文件命令: ${cmd.type}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return diagramError('INTERNAL', message)
    }
  }
}
