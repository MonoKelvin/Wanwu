import { DiagramAppCommandBase } from '@modules/library/diagrams/app/command/DiagramAppCommand'
import type { DiagramCommandRegistry } from '@modules/library/diagrams/app/command/DiagramCommandRegistry'
import type { DiagramCommandExecutionContext } from '@modules/library/diagrams/app/command/DiagramAppCommand'
import { requireCanvas, runDocumentMutation, isCanvasContext } from '@modules/library/diagrams/app/command/canvasContext'
import { diagramError } from '@modules/library/diagrams/app/diagramCommandErrors'
import { resolveCanvasNudgeDelta } from '@modules/library/diagrams/lib/canvasNudgeStep'
import {
  captureNodeLayoutPatch,
  isLayoutNodeProps
} from '@modules/library/diagrams/app/transaction/DiagramNodeLayoutUnit'
import {
  createGraphSnapshotFromToUnit,
  graphDataEqual
} from '@modules/library/diagrams/app/transaction/DiagramGraphSnapshotFromToUnit'
import { runCanvasCommandTransaction } from '@modules/library/diagrams/app/transaction/canvasTransaction'
import { DiagramCmd } from '@modules/library/diagrams/app/command/domain/ids'
import type {
  DiagramDocumentAddNodeParams,
  DiagramDocumentFinishDragParams,
  DiagramDocumentModifyNodeParams
} from '@modules/library/diagrams/app/command/domain/payloads'

class AddNodeCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.Document.AddNode
  readonly title = '添加节点'
  readonly usesTransaction = true

  execute(params: DiagramDocumentAddNodeParams | undefined, ctx: DiagramCommandExecutionContext) {
    const p = this.castParams<DiagramDocumentAddNodeParams>(params)
    return runDocumentMutation(ctx, this.title, (canvas) => {
      const port = canvas.port
      const nodeId = p.insertEdgeId
        ? port.addNodeOnEdge(p.shape, p.x, p.y, p.insertEdgeId, p.text, p.style)
        : port.addNode(p.shape, p.x, p.y, p.text, p.style)
      port.select([nodeId])
    })
  }
}

class ModifyNodeCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.Document.ModifyNode
  readonly title = '改节点属性'
  readonly usesTransaction = true

  execute(params: DiagramDocumentModifyNodeParams | undefined, ctx: DiagramCommandExecutionContext) {
    const p = this.castParams<DiagramDocumentModifyNodeParams>(params)
    const canvas = requireCanvas(ctx)
    if (!isCanvasContext(canvas)) return Promise.resolve(canvas)

    const nodeProps = p.nodeProps as Record<string, unknown> | undefined
    const lf = canvas.port.getLogicFlow()
    let layoutBefore = null as ReturnType<typeof captureNodeLayoutPatch>
    if (nodeProps && lf && isLayoutNodeProps(nodeProps)) {
      layoutBefore = captureNodeLayoutPatch(lf, p.nodeId)
    }

    return runDocumentMutation(
      ctx,
      this.title,
      (c) => {
        if (layoutBefore && nodeProps) return
        if (nodeProps) {
          c.port.updateNodeProperties({ id: p.nodeId, ...nodeProps })
        } else if (p.patch) {
          c.port.updateNode(p.nodeId, p.patch)
        }
      },
      layoutBefore && nodeProps
        ? { nodeId: p.nodeId, nodeProps, layoutBefore }
        : undefined
    )
  }
}

class FinishDragCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.Document.FinishDrag
  readonly title = '移动图元'
  readonly usesTransaction = true

  async execute(params: DiagramDocumentFinishDragParams | undefined, ctx: DiagramCommandExecutionContext) {
    const p = this.castParams<DiagramDocumentFinishDragParams>(params)
    if (graphDataEqual(p.beforeGraph, p.afterGraph)) return { ok: true as const }

    const canvas = requireCanvas(ctx)
    if (!isCanvasContext(canvas)) return canvas

    const result = await runCanvasCommandTransaction(canvas, this.title, async (applyUnit) => {
      const unit = createGraphSnapshotFromToUnit(
        this.title,
        () => canvas.port,
        p.beforeGraph,
        p.afterGraph,
        p.beforeSelection,
        p.afterSelection
      )
      const applied = await applyUnit(unit)
      if (!applied.ok) return diagramError('INTERNAL', applied.message ?? '记录拖拽失败')
      return { ok: true as const }
    })
    return result
  }
}

class UndoCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.Document.Undo
  readonly title = '撤销'

  async execute(_params: undefined, ctx: DiagramCommandExecutionContext) {
    const canvas = requireCanvas(ctx)
    if (!isCanvasContext(canvas)) return canvas
    const tx = canvas.tx
    if (!tx?.canUndo()) return { ok: true as const }
    const undoResult = await canvas.port.withUndoRedoRestoreAsync(() => tx.undo())
    if (!undoResult.ok) return diagramError('INTERNAL', undoResult.message ?? '撤销失败')
    canvas.session.markActivePageDirty()
    return { ok: true as const }
  }
}

class RedoCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.Document.Redo
  readonly title = '重做'

  async execute(_params: undefined, ctx: DiagramCommandExecutionContext) {
    const canvas = requireCanvas(ctx)
    if (!isCanvasContext(canvas)) return canvas
    const tx = canvas.tx
    if (!tx?.canRedo()) return { ok: true as const }
    const redoResult = await canvas.port.withUndoRedoRestoreAsync(() => tx.redo())
    if (!redoResult.ok) return diagramError('INTERNAL', redoResult.message ?? '重做失败')
    canvas.session.markActivePageDirty()
    return { ok: true as const }
  }
}

class CopyNodeCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.Document.CopyNode
  readonly title = '复制'

  execute(_params: undefined, ctx: DiagramCommandExecutionContext) {
    const canvas = requireCanvas(ctx)
    if (!isCanvasContext(canvas)) return Promise.resolve(canvas)
    canvas.port.copy()
    return Promise.resolve({ ok: true as const })
  }
}

class PasteCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.Document.Paste
  readonly title = '粘贴'
  readonly usesTransaction = true

  execute(params: { x?: number; y?: number } | undefined, ctx: DiagramCommandExecutionContext) {
    const p = this.castParams<{ x?: number; y?: number }>(params)
    return runDocumentMutation(ctx, this.title, (canvas) => {
      canvas.port.paste(p.x, p.y)
    })
  }
}

class NudgeSelectionCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.Document.NudgeSelection
  readonly title = '微移选中'
  readonly usesTransaction = true

  execute(
    params: { direction: string; large?: boolean; fine?: boolean; nodeIds?: string[] } | undefined,
    ctx: DiagramCommandExecutionContext
  ) {
    const p = this.castParams<{
      direction: 'left' | 'right' | 'up' | 'down'
      large?: boolean
      fine?: boolean
      nodeIds?: string[]
    }>(params)
    const canvas = requireCanvas(ctx)
    if (!isCanvasContext(canvas)) return Promise.resolve(canvas)

    const delta = resolveCanvasNudgeDelta(p.direction, {
      snapGrid: canvas.port.getCanvasSettings().snapGrid,
      large: Boolean(p.large),
      fine: Boolean(p.fine)
    })
    if (!delta) return Promise.resolve(diagramError('VALIDATION', '无效的移动方向'))

    return runDocumentMutation(ctx, this.title, (c) => {
      c.port.nudgeSelection(delta.dx, delta.dy, p.nodeIds)
    })
  }
}

function mutationCommand(
  id: (typeof DiagramCmd.Document)[keyof typeof DiagramCmd.Document],
  title: string,
  mutate: (canvas: import('@modules/library/diagrams/app/transaction/canvasTransaction').DiagramCanvasTransactionContext, p: Record<string, unknown>) => void | Promise<void>
) {
  return class extends DiagramAppCommandBase {
    readonly id = id
    readonly title = title
    readonly usesTransaction = true

    execute(params: Record<string, unknown> | undefined, ctx: DiagramCommandExecutionContext) {
      const p = this.castParams<Record<string, unknown>>(params)
      return runDocumentMutation(ctx, title, (canvas) => mutate(canvas, p))
    }
  }
}

export function registerDocumentContentCommands(registry: DiagramCommandRegistry): void {
  registry
    .registerSingleton(new AddNodeCommand())
    .registerSingleton(new ModifyNodeCommand())
    .registerSingleton(new FinishDragCommand())
    .registerSingleton(new UndoCommand())
    .registerSingleton(new RedoCommand())
    .registerSingleton(new CopyNodeCommand())
    .registerSingleton(new PasteCommand())
    .registerSingleton(new NudgeSelectionCommand())
    .registerSingleton(
      new (mutationCommand(DiagramCmd.Document.ModifyEdge, '改连线属性', (canvas, p) => {
        if (p.edgeProps) {
          canvas.port.updateEdgeProperties({
            id: p.edgeId as string,
            ...(p.edgeProps as Record<string, unknown>)
          })
        } else {
          canvas.port.updateEdge(p.edgeId as string, p.patch as Record<string, unknown>)
        }
      }))()
    )
    .registerSingleton(
      new (mutationCommand(DiagramCmd.Document.ModifyCanvasSettings, '改画布设置', (canvas, p) => {
        canvas.port.applyCanvasSettings(p.settings as Record<string, unknown>)
      }))()
    )
    .registerSingleton(
      new (mutationCommand(DiagramCmd.Document.BatchModifyNodes, '批量改节点', (canvas, p) => {
        canvas.port.batchUpdateNodeProperties(
          p.nodeProps as Parameters<typeof canvas.port.batchUpdateNodeProperties>[0],
          p.nodeIds as string[] | undefined
        )
      }))()
    )
    .registerSingleton(
      new (mutationCommand(DiagramCmd.Document.BatchModifyEdges, '批量改连线', (canvas, p) => {
        canvas.port.batchUpdateEdgeProperties(
          p.edgeProps as Parameters<typeof canvas.port.batchUpdateEdgeProperties>[0],
          p.edgeIds as string[] | undefined
        )
      }))()
    )
    .registerSingleton(
      new (mutationCommand(DiagramCmd.Document.AlignNodes, '对齐', (canvas, p) => {
        canvas.port.alignNodes(
          p.mode as Parameters<typeof canvas.port.alignNodes>[0],
          p.nodeIds as string[] | undefined
        )
      }))()
    )
    .registerSingleton(
      new (mutationCommand(DiagramCmd.Document.DistributeNodes, '分布', (canvas, p) => {
        canvas.port.distributeNodes(
          p.mode as Parameters<typeof canvas.port.distributeNodes>[0],
          p.nodeIds as string[] | undefined
        )
      }))()
    )
    .registerSingleton(
      new (mutationCommand(DiagramCmd.Document.DeleteSelection, '删除选中', async (canvas, p) => {
        await canvas.port.deleteSelection(p.nodeIds as string[] | undefined, p.edgeIds as string[] | undefined)
      }))()
    )
    .registerSingleton(
      new (mutationCommand(DiagramCmd.Document.Connect, '连线', (canvas, p) => {
        canvas.port.connect(
          p.sourceNodeId as string,
          p.targetNodeId as string,
          p.style as Record<string, unknown>
        )
      }))()
    )
    .registerSingleton(
      new (mutationCommand(DiagramCmd.Document.Group, '组合', (canvas, p) => {
        canvas.port.groupSelection(p.nodeIds as string[] | undefined, p.edgeIds as string[] | undefined)
      }))()
    )
    .registerSingleton(
      new (mutationCommand(DiagramCmd.Document.Ungroup, '拆组', (canvas) => {
        canvas.port.ungroupSelection()
      }))()
    )
    .registerSingleton(
      new (mutationCommand(DiagramCmd.Document.BringToFront, '置于顶层', (canvas, p) => {
        canvas.port.bringNodesToFront(p.nodeIds as string[] | undefined)
      }))()
    )
    .registerSingleton(
      new (mutationCommand(DiagramCmd.Document.SendToBack, '置于底层', (canvas, p) => {
        canvas.port.sendNodesToBack(p.nodeIds as string[] | undefined)
      }))()
    )
    .registerSingleton(
      new (mutationCommand(DiagramCmd.Document.SetGrid, '网格设置', (canvas, p) => {
        canvas.port.setGrid(p.visible as boolean, p.snap as boolean | undefined)
      }))()
    )
    .registerSingleton(
      new (mutationCommand(DiagramCmd.Document.ClearStyles, '清空样式', (canvas) => {
        canvas.port.clearSelectionStyles()
      }))()
    )
    .registerSingleton(
      new (class SelectCommand extends DiagramAppCommandBase {
        readonly id = DiagramCmd.Document.Select
        readonly title = '选中'
        execute(params: Record<string, unknown> | undefined, ctx: DiagramCommandExecutionContext) {
          const canvas = requireCanvas(ctx)
          if (!isCanvasContext(canvas)) return Promise.resolve(canvas)
          const p = this.castParams<Record<string, unknown>>(params)
          canvas.port.select(
            p.nodeIds as string[],
            p.edgeIds as string[] | undefined,
            p.append as boolean | undefined
          )
          return Promise.resolve({ ok: true as const })
        }
      })()
    )
    .registerSingleton(
      new (class extends DiagramAppCommandBase {
        readonly id = DiagramCmd.Document.SelectAll
        readonly title = '全选'
        execute(_p: undefined, ctx: DiagramCommandExecutionContext) {
          const canvas = requireCanvas(ctx)
          if (!isCanvasContext(canvas)) return Promise.resolve(canvas)
          canvas.port.selectAll()
          return Promise.resolve({ ok: true as const })
        }
      })()
    )
    .registerSingleton(
      new (class extends DiagramAppCommandBase {
        readonly id = DiagramCmd.Document.ClearSelection
        readonly title = '清除选中'
        execute(_p: undefined, ctx: DiagramCommandExecutionContext) {
          const canvas = requireCanvas(ctx)
          if (!isCanvasContext(canvas)) return Promise.resolve(canvas)
          canvas.port.clearSelection()
          return Promise.resolve({ ok: true as const })
        }
      })()
    )
    .registerSingleton(
      new (class extends DiagramAppCommandBase {
        readonly id = DiagramCmd.Document.Zoom
        readonly title = '缩放'
        execute(params: Record<string, unknown> | undefined, ctx: DiagramCommandExecutionContext) {
          const canvas = requireCanvas(ctx)
          if (!isCanvasContext(canvas)) return Promise.resolve(canvas)
          const p = this.castParams<Record<string, unknown>>(params)
          canvas.port.zoom(p.delta as number | undefined, p.scale as number | undefined)
          return Promise.resolve({ ok: true as const })
        }
      })()
    )
    .registerSingleton(
      new (class extends DiagramAppCommandBase {
        readonly id = DiagramCmd.Document.ZoomToFit
        readonly title = '适应画布'
        execute(_p: undefined, ctx: DiagramCommandExecutionContext) {
          const canvas = requireCanvas(ctx)
          if (!isCanvasContext(canvas)) return Promise.resolve(canvas)
          canvas.port.zoomToFit()
          return Promise.resolve({ ok: true as const })
        }
      })()
    )
    .registerSingleton(
      new (class extends DiagramAppCommandBase {
        readonly id = DiagramCmd.Document.ZoomReset
        readonly title = '重置缩放'
        execute(_p: undefined, ctx: DiagramCommandExecutionContext) {
          const canvas = requireCanvas(ctx)
          if (!isCanvasContext(canvas)) return Promise.resolve(canvas)
          canvas.port.zoomReset()
          return Promise.resolve({ ok: true as const })
        }
      })()
    )
    .registerSingleton(
      new (class extends DiagramAppCommandBase {
        readonly id = DiagramCmd.Document.CenterContent
        readonly title = '居中内容'
        execute(_p: undefined, ctx: DiagramCommandExecutionContext) {
          const canvas = requireCanvas(ctx)
          if (!isCanvasContext(canvas)) return Promise.resolve(canvas)
          canvas.port.centerContent()
          return Promise.resolve({ ok: true as const })
        }
      })()
    )
    .registerSingleton(
      new (class extends DiagramAppCommandBase {
        readonly id = DiagramCmd.Document.CenterOrigin
        readonly title = '居中原点'
        execute(_p: undefined, ctx: DiagramCommandExecutionContext) {
          const canvas = requireCanvas(ctx)
          if (!isCanvasContext(canvas)) return Promise.resolve(canvas)
          canvas.port.centerOrigin()
          return Promise.resolve({ ok: true as const })
        }
      })()
    )
    .registerSingleton(
      new (class extends DiagramAppCommandBase {
        readonly id = DiagramCmd.Document.FormatPainterCancel
        readonly title = '取消格式刷'
        execute(_p: undefined, ctx: DiagramCommandExecutionContext) {
          const canvas = requireCanvas(ctx)
          if (!isCanvasContext(canvas)) return Promise.resolve(canvas)
          canvas.port.cancelFormatPainter()
          return Promise.resolve({ ok: true as const })
        }
      })()
    )
    .registerSingleton(
      new (class extends DiagramAppCommandBase {
        readonly id = DiagramCmd.Document.FormatPainterStart
        readonly title = '格式刷'
        execute(_p: undefined, ctx: DiagramCommandExecutionContext) {
          const canvas = requireCanvas(ctx)
          if (!isCanvasContext(canvas)) return Promise.resolve(canvas)
          if (!canvas.port.startFormatPainter()) {
            return Promise.resolve(diagramError('VALIDATION', '请选中单个图元或连线后使用格式刷'))
          }
          return Promise.resolve({ ok: true as const })
        }
      })()
    )
}
