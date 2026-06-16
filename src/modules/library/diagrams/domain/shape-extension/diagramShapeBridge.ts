import type LogicFlow from '@logicflow/core'
import { ensureDiagramShapeExtensions } from '@modules/library/diagrams/app/diagramShapeExtensions'
import { getDiagramShapeExtensionRegistry } from '@modules/library/diagrams/domain/shape-extension/DiagramShapeExtensionRegistry'
import { readDgShapeFromProperties } from '@modules/library/diagrams/domain/shape-extension/diagramShapePayload'
import type { DiagramNodeShapeExtensionView } from '@modules/library/diagrams/lib/diagramSelectionTypes'
import { syncNodeSizeProperties } from '@modules/library/diagrams/lib/diagramShapeResize'
import { notifyTableExternalPropertyPatch } from '@modules/library/diagrams/extensions/table/interaction/tablePropertyBridge'
import { DIAGRAM_TABLE_KIND } from '@modules/library/diagrams/extensions/table/kinds/tableTypes'
import {
  DG_SHAPE_PAYLOAD_KEY,
  type DiagramShapePayloadEnvelope
} from '@modules/library/diagrams/domain/shape-extension/types'

export type { DiagramNodeShapeExtensionView }

export function readNodeShapeExtension(
  properties: Record<string, unknown> | undefined
): DiagramNodeShapeExtensionView | null {
  const envelope = readDgShapeFromProperties(properties)
  if (!envelope) return null

  const registry = ensureDiagramShapeExtensions()
  const kindReg = registry.getKind(envelope.kind)
  if (!kindReg) {
    return { kind: envelope.kind, data: envelope.data }
  }

  return {
    kind: envelope.kind,
    data: kindReg.codec.read(envelope as DiagramShapePayloadEnvelope)
  }
}

/** 内部修订号：layoutHandledByModel 的自定义 View 在仅 dgShape 内容变更时强制 MobX 重绘 */
export const DG_SHAPE_RENDER_REV_KEY = '_dgShapeRev' as const

/** layoutHandledByModel 图形在 dgShape 更新后 bump 修订号，触发 observer View 重绘 */
export function refreshLayoutHandledShapeView(lf: LogicFlow, nodeId: string): void {
  const model = lf.getNodeModelById(nodeId)
  if (!model) return
  const props = model.properties as Record<string, unknown>
  const nextRev = Number(props[DG_SHAPE_RENDER_REV_KEY] ?? 0) + 1
  lf.setProperties(nodeId, { [DG_SHAPE_RENDER_REV_KEY]: nextRev })
}

/** 合并并写入 dgShape，同步布局/文本副作用 */
export function patchNodeDgShape(
  lf: LogicFlow,
  nodeId: string,
  envelope: DiagramShapePayloadEnvelope
): void {
  const model = lf.getNodeModelById(nodeId)
  if (!model) return

  const kindReg = getDiagramShapeExtensionRegistry().getKind(envelope.kind)
  const props = model.properties as Record<string, unknown>
  const propertyPatch: Record<string, unknown> = {
    [DG_SHAPE_PAYLOAD_KEY]: envelope
  }
  // 与 dgShape 同次写入修订号，避免两次 setProperties 及多余的 setAttributes
  if (kindReg?.codec.layoutHandledByModel === true) {
    propertyPatch[DG_SHAPE_RENDER_REV_KEY] =
      Number(props[DG_SHAPE_RENDER_REV_KEY] ?? 0) + 1
  }

  lf.setProperties(nodeId, propertyPatch)

  if (!kindReg) return
  if (kindReg.codec.layoutHandledByModel === true) {
    const updated = lf.getNodeModelById(nodeId)
    if (updated) {
      const data = kindReg.codec.read(envelope as DiagramShapePayloadEnvelope)
      if (kindReg.codec.syncLayoutToModel) {
        kindReg.codec.syncLayoutToModel(updated, data)
      } else {
        syncNodeSizeProperties(updated)
      }
    }
    if (envelope.kind === DIAGRAM_TABLE_KIND) {
      notifyTableExternalPropertyPatch(lf, nodeId)
    }
    return
  }
  syncNodeShapeExtensionEffects(lf, nodeId)
}

/** 加载图后同步单个节点的扩展布局/文本（layoutHandledByModel 需额外刷新 View） */
export function syncShapeExtensionNodeAfterLoad(lf: LogicFlow, nodeId: string): void {
  const model = lf.getNodeModelById(nodeId)
  if (!model) return

  const view = readNodeShapeExtension(model.properties as Record<string, unknown>)
  if (!view) return

  const kindReg = getDiagramShapeExtensionRegistry().getKind(view.kind)
  if (!kindReg) return

  if (kindReg.codec.layoutHandledByModel === true) {
    if (kindReg.codec.syncLayoutToModel) {
      kindReg.codec.syncLayoutToModel(model, view.data)
    } else if ('setAttributes' in model && typeof model.setAttributes === 'function') {
      ;(model as { setAttributes: () => void }).setAttributes()
    }
    refreshLayoutHandledShapeView(lf, nodeId)
    return
  }
  syncNodeShapeExtensionEffects(lf, nodeId)
}

export function syncNodeShapeExtensionEffects(lf: LogicFlow, nodeId: string): void {
  const model = lf.getNodeModelById(nodeId)
  if (!model) return

  const view = readNodeShapeExtension(model.properties as Record<string, unknown>)
  if (!view) return

  const kindReg = getDiagramShapeExtensionRegistry().getKind(view.kind)
  if (!kindReg) return

  let layoutChanged = false
  const layout =
    kindReg.codec.layoutHandledByModel === true
      ? null
      : kindReg.codec.computeLayout?.(view.data, model.width)
  if (layout) {
    const minW = layout.minWidth ?? layout.width
    const minH = layout.minHeight ?? layout.height
    if (typeof model.minWidth === 'number') {
      model.minWidth = Math.max(80, minW)
    }
    if (typeof model.minHeight === 'number') {
      model.minHeight = Math.max(48, minH)
    }
    // 仅随内容增长尺寸，不缩小用户手动放大的宽高（与各扩展 Model.setAttributes 策略一致）
    if (layout.width > model.width + 0.5) {
      model.width = layout.width
      layoutChanged = true
    }
    if (layout.height > model.height + 0.5) {
      model.height = layout.height
      layoutChanged = true
    }
    if (layoutChanged) {
      syncNodeSizeProperties(model)
    }
  }

  if (kindReg.codec.syncLfText !== false) {
    const text = kindReg.codec.serializeText?.(view.data)
    if (text != null) {
      model.updateText(text)
    }
  }
}

export function applyNodeShapeExtension(
  lf: LogicFlow,
  nodeId: string,
  kind: string,
  data: unknown
): void {
  const kindReg = ensureDiagramShapeExtensions().getKind(kind)
  if (!kindReg) return

  patchNodeDgShape(lf, nodeId, kindReg.codec.toEnvelope(data))
}

/** 命令总线 / 右键菜单等：生成带 dgShape 的通用 modifyNode patch */
export function buildShapeExtensionModifyNodePatch(
  kind: string,
  data: unknown
): Record<string, unknown> | null {
  const kindReg = ensureDiagramShapeExtensions().getKind(kind)
  if (!kindReg) return null
  return {
    properties: {
      [DG_SHAPE_PAYLOAD_KEY]: kindReg.codec.toEnvelope(data)
    }
  }
}
