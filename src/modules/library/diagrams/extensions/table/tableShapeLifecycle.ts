import type { DiagramShapeNodePatchContext } from '@modules/library/diagrams/domain/shape-extension/interfaces'
import { notifyTableExternalPropertyPatch } from '@modules/library/diagrams/extensions/table/interaction/tablePropertyBridge'

/** 表格 kind 在节点 patch 后的生命周期：清理交互残留并刷新命中层 */
export function onTableShapeNodePatched(ctx: DiagramShapeNodePatchContext): void {
  notifyTableExternalPropertyPatch(ctx.lf, ctx.nodeId, {
    skipRenderRefresh: ctx.source === 'dgShape'
  })
}
