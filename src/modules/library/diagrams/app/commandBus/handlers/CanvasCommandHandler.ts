import type { IDiagramCommandHandler } from '@modules/library/diagrams/interfaces/IDiagramCommandHandler'
import type {
  DiagramCommandContext,
  DiagramCommandEnvelope,
  DiagramCommandResult
} from '@modules/library/diagrams/domain/commands/types'
import type { DiagramEditorSession } from '@modules/library/diagrams/app/DiagramEditorSession'
import { diagramError } from '@modules/library/diagrams/app/diagramCommandErrors'

export class CanvasCommandHandler implements IDiagramCommandHandler {
  readonly domain = 'canvas' as const

  constructor(private readonly getSession: () => DiagramEditorSession | null) {}

  canHandle(type: string): boolean {
    return type.startsWith('canvas.')
  }

  async execute(cmd: DiagramCommandEnvelope, _ctx: DiagramCommandContext): Promise<DiagramCommandResult> {
    const session = this.getSession()
    if (!session) return diagramError('NO_SESSION', '无活跃编辑器会话')

    const port = session.editorPort
    const p = cmd.payload ?? {}

    try {
      switch (cmd.type) {
        case 'canvas.addNode': {
          const nodeId = port.addNode(
            p.shape as string,
            p.x as number,
            p.y as number,
            p.text as string | undefined,
            p.style as Record<string, unknown> | undefined
          )
          port.select([nodeId])
          session.markActivePageDirty()
          return { ok: true, data: { nodeId } }
        }
        case 'canvas.updateNode':
          if (p.nodeProps) {
            port.updateNodeProperties({
              id: p.nodeId as string,
              ...(p.nodeProps as Record<string, unknown>)
            })
          } else {
            port.updateNode(p.nodeId as string, p.patch as Record<string, unknown>)
          }
          session.markActivePageDirty()
          return { ok: true }
        case 'canvas.updateEdge':
          if (p.edgeProps) {
            port.updateEdgeProperties({
              id: p.edgeId as string,
              ...(p.edgeProps as Record<string, unknown>)
            })
          } else {
            port.updateEdge(p.edgeId as string, p.patch as Record<string, unknown>)
          }
          session.markActivePageDirty()
          return { ok: true }
        case 'canvas.updateSettings':
          port.applyCanvasSettings(p.settings as Record<string, unknown>)
          session.markActivePageDirty()
          return { ok: true }
        case 'canvas.batchUpdateNodes':
          port.batchUpdateNodeProperties(
            p.nodeProps as Partial<import('@modules/library/diagrams/lib/diagramSelectionTypes').DiagramNodeProperties>,
            p.nodeIds as string[] | undefined
          )
          session.markActivePageDirty()
          return { ok: true }
        case 'canvas.batchUpdateEdges':
          port.batchUpdateEdgeProperties(
            p.edgeProps as Partial<import('@modules/library/diagrams/lib/diagramSelectionTypes').DiagramEdgeProperties>,
            p.edgeIds as string[] | undefined
          )
          session.markActivePageDirty()
          return { ok: true }
        case 'canvas.alignNodes':
          port.alignNodes(
            p.mode as import('@modules/library/diagrams/lib/diagramNodeLayout').DiagramAlignMode,
            p.nodeIds as string[] | undefined
          )
          session.markActivePageDirty()
          return { ok: true }
        case 'canvas.distributeNodes':
          port.distributeNodes(
            p.mode as import('@modules/library/diagrams/lib/diagramNodeLayout').DiagramDistributeMode,
            p.nodeIds as string[] | undefined
          )
          session.markActivePageDirty()
          return { ok: true }
        case 'canvas.deleteSelection':
          port.deleteSelection(p.nodeIds as string[] | undefined, p.edgeIds as string[] | undefined)
          session.markActivePageDirty()
          return { ok: true }
        case 'canvas.connect': {
          const edgeId = port.connect(
            p.sourceNodeId as string,
            p.targetNodeId as string,
            p.style as Record<string, unknown> | undefined
          )
          session.markActivePageDirty()
          return { ok: true, data: { edgeId } }
        }
        case 'canvas.select':
          port.select(
            p.nodeIds as string[],
            p.edgeIds as string[] | undefined,
            p.append as boolean | undefined
          )
          return { ok: true }
        case 'canvas.selectAll':
          port.selectAll()
          return { ok: true }
        case 'canvas.clearSelection':
          port.clearSelection()
          return { ok: true }
        case 'canvas.copy':
          port.copy()
          return { ok: true }
        case 'canvas.paste':
          port.paste(p.x as number | undefined, p.y as number | undefined)
          session.markActivePageDirty()
          return { ok: true }
        case 'canvas.duplicate':
          port.duplicate(p.offsetX as number | undefined, p.offsetY as number | undefined)
          session.markActivePageDirty()
          return { ok: true }
        case 'canvas.group':
          port.groupSelection(p.nodeIds as string[] | undefined, p.edgeIds as string[] | undefined)
          session.markActivePageDirty()
          return { ok: true }
        case 'canvas.ungroup':
          port.ungroupSelection()
          session.markActivePageDirty()
          return { ok: true }
        case 'canvas.undo':
          port.undo()
          session.markActivePageDirty()
          return { ok: true }
        case 'canvas.redo':
          port.redo()
          session.markActivePageDirty()
          return { ok: true }
        case 'canvas.zoom':
          port.zoom(p.delta as number | undefined, p.scale as number | undefined)
          return { ok: true }
        case 'canvas.zoomToFit':
          port.zoomToFit()
          return { ok: true }
        case 'canvas.zoomReset':
          port.zoomReset()
          return { ok: true }
        case 'canvas.centerOrigin':
          port.centerOrigin()
          return { ok: true }
        case 'canvas.setGrid':
          port.setGrid(p.visible as boolean, p.snap as boolean | undefined)
          session.markActivePageDirty()
          return { ok: true }
        default:
          return diagramError('UNKNOWN_COMMAND', `未支持的画布命令: ${cmd.type}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return diagramError('INTERNAL', message)
    }
  }
}
