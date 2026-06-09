import type { IDiagramShapePayloadCodec } from '@modules/library/diagrams/domain/shape-extension/interfaces'
import type { DiagramShapePayloadEnvelope } from '@modules/library/diagrams/domain/shape-extension/types'
import { umlClassifierCodec } from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierCodec'

/**
 * 仅含 codec、无 LogicFlow 渲染器 — 供主进程搜索/导出等场景使用。
 * 新增结构化图形扩展时在此注册 serializeText。
 */
const shapeTextCodecs: Record<string, IDiagramShapePayloadCodec> = {
  [umlClassifierCodec.kind]: umlClassifierCodec
}

export function serializeDiagramShapeEnvelopeText(
  envelope: DiagramShapePayloadEnvelope
): string {
  const codec = shapeTextCodecs[envelope.kind]
  if (!codec) return ''
  const data = codec.read(envelope)
  return codec.serializeText?.(data)?.trim() ?? ''
}
