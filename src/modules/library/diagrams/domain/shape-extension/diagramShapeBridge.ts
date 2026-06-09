import type LogicFlow from '@logicflow/core'
import { ensureDiagramShapeExtensions } from '@modules/library/diagrams/app/diagramShapeExtensions'
import { getDiagramShapeExtensionRegistry } from '@modules/library/diagrams/domain/shape-extension/DiagramShapeExtensionRegistry'
import {
  mergeDgShapeIntoProperties,
  readDgShapeFromProperties
} from '@modules/library/diagrams/domain/shape-extension/diagramShapePayload'
import { syncNodeSizeProperties } from '@modules/library/diagrams/lib/diagramShapeResize'
import type { DiagramShapePayloadEnvelope } from '@modules/library/diagrams/domain/shape-extension/types'

export interface DiagramNodeShapeExtensionView {
  kind: string
  data: unknown
}

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

export function syncNodeShapeExtensionEffects(lf: LogicFlow, nodeId: string): void {
  const model = lf.getNodeModelById(nodeId)
  if (!model) return

  const view = readNodeShapeExtension(model.properties as Record<string, unknown>)
  if (!view) return

  const kindReg = getDiagramShapeExtensionRegistry().getKind(view.kind)
  if (!kindReg) return

  let layoutChanged = false
  const layout = kindReg.codec.computeLayout?.(view.data, model.width)
  if (layout) {
    if (Math.abs(model.width - layout.width) > 0.5 || Math.abs(model.height - layout.height) > 0.5) {
      model.width = layout.width
      model.height = layout.height
      syncNodeSizeProperties(model)
      layoutChanged = true
    }
  }

  const text = kindReg.codec.serializeText?.(view.data)
  if (text != null) {
    model.updateText(text)
  }

  if (layoutChanged && 'setAttributes' in model && typeof model.setAttributes === 'function') {
    ;(model as { setAttributes: () => void }).setAttributes()
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

  const envelope = kindReg.codec.toEnvelope(data)
  const model = lf.getNodeModelById(nodeId)
  if (!model) return

  const nextProps = mergeDgShapeIntoProperties(
    model.properties as Record<string, unknown>,
    envelope
  )

  lf.setProperties(nodeId, nextProps)
  syncNodeShapeExtensionEffects(lf, nodeId)
}
