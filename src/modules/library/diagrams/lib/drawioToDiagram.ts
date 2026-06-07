import { createBlankDiagramContent } from './blankContent'
import {
  normalizeEdgeStyleProperties,
  normalizeNodeStyleProperties
} from '@modules/library/diagrams/lib/diagramStyleBridge'
import type { DiagramContent, DiagramGraphData, DiagramPage } from '@shared/types/diagrams'

export interface DrawioParsePage {
  name: string
  graphXml: string
}

interface MxCell {
  id: string
  value: string
  style: string
  vertex: boolean
  edge: boolean
  source: string
  target: string
  parent: string
  x: number
  y: number
  width: number
  height: number
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#xa;/gi, '\n')
    .replace(/&#10;/g, '\n')
}

function parseAttrString(attrStr: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const re = /([\w:-]+)=("([^"]*)"|'([^']*)')/g
  let m: RegExpExecArray | null
  while ((m = re.exec(attrStr))) {
    attrs[m[1]!] = decodeXmlEntities(m[3] ?? m[4] ?? '')
  }
  return attrs
}

function parseMxCells(graphXml: string): MxCell[] {
  const cells: MxCell[] = []
  const cellRe = /<mxCell\b([^>/]*)(?:\/>|>([\s\S]*?)<\/mxCell>)/g
  let m: RegExpExecArray | null
  while ((m = cellRe.exec(graphXml))) {
    const attrs = parseAttrString(m[1] ?? '')
    const inner = m[2] ?? ''
    const geoMatch = inner.match(/<mxGeometry\b([^>/]*)(?:\/>|>[\s\S]*?<\/mxGeometry>)/)
    const geo = geoMatch ? parseAttrString(geoMatch[1] ?? '') : {}

    const x = Number(geo.x ?? 0)
    const y = Number(geo.y ?? 0)
    const width = Number(geo.width ?? 120)
    const height = Number(geo.height ?? 60)

    cells.push({
      id: attrs.id ?? '',
      value: attrs.value ?? '',
      style: attrs.style ?? '',
      vertex: attrs.vertex === '1',
      edge: attrs.edge === '1',
      source: attrs.source ?? '',
      target: attrs.target ?? '',
      parent: attrs.parent ?? '',
      x,
      y,
      width,
      height
    })
  }
  return cells.filter((c) => c.id && c.id !== '0' && c.id !== '1')
}

function styleFlags(style: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of style.split(';')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const eq = trimmed.indexOf('=')
    if (eq >= 0) out[trimmed.slice(0, eq)] = trimmed.slice(eq + 1)
    else out[trimmed] = '1'
  }
  return out
}

function mapDrawioStyleToLfType(style: string): string {
  const flags = styleFlags(style)
  const shape = flags.shape ?? ''

  if (shape === 'umlActor') return 'dg-actor'
  if (shape === 'note') return 'dg-note'
  if (shape === 'cloud') return 'dg-cloud'
  if (shape === 'cylinder' || shape === 'cylinder2') return 'dg-stored-data'
  if (shape === 'swimlane') return 'dg-swimlane'
  if (shape === 'image') return 'dg-image'
  if (shape === 'hexagon') return 'dg-hexagon'
  if (shape === 'triangle' || shape === 'mxgraph.basic.acute_triangle') return 'dg-triangle-up'
  if (shape === 'process' || shape === 'step') return 'dg-process'
  if (shape === 'ext' && flags.double === '1') return 'dg-subprocess'
  if (shape === 'document' || shape === 'mxgraph.flowchart.document') return 'dg-document'
  if (shape === 'parallelogram') return 'dg-parallelogram'
  if (shape === 'trapezoid') return 'dg-trapezoid'
  if (shape === 'or') return 'dg-or'
  if (shape === 'cross') return 'dg-cross'
  if (shape === 'card') return 'dg-round-rect'
  if (shape === 'mxgraph.flowchart.terminator') return 'dg-terminator'
  if (shape === 'mxgraph.flowchart.process') return 'dg-process'
  if (shape === 'mxgraph.flowchart.decision') return 'dg-decision'
  if (shape === 'mxgraph.flowchart.data') return 'dg-data'
  if (shape === 'mxgraph.flowchart.database') return 'dg-stored-data'
  if (shape === 'mxgraph.flowchart.manual_input') return 'dg-manual-input'
  if (shape === 'mxgraph.flowchart.preparation') return 'dg-preparation'
  if (shape === 'mxgraph.flowchart.delay') return 'dg-delay'
  if (shape === 'mxgraph.flowchart.display') return 'dg-display'
  if (shape === 'mxgraph.flowchart.off_page_connector') return 'dg-off-page'
  if (shape === 'mxgraph.flowchart.or') return 'dg-or'
  if (shape === 'mxgraph.flowchart.summing_junction') return 'dg-merge'

  if (flags.ellipse === '1' || shape === 'ellipse') return 'dg-ellipse'
  if (flags.rhombus === '1' || shape === 'rhombus' || shape === 'xor') return 'dg-decision'
  if (flags.rounded === '1') return 'dg-round-rect'
  if (flags.text === '1' || shape === 'text') return 'text'
  if (flags.image != null || flags.imageAspect != null) return 'dg-image'

  return 'dg-rect'
}

function mapDrawioArrow(flag?: string): string | undefined {
  if (!flag || flag === 'none' || flag === '0') return 'none'
  if (flag.includes('open')) return 'hollow'
  if (flag.includes('diamond')) return 'diamond'
  if (flag.includes('oval') || flag.includes('ellipse')) return 'circle'
  return 'solid'
}

function isSwimlaneContainer(cell: MxCell): boolean {
  const flags = styleFlags(cell.style)
  return flags.childLayout === 'stackLayout' || (flags.swimlane === '1' && !cell.value.trim())
}

function centerFromTopLeft(x: number, y: number, w: number, h: number) {
  return { x: x + w / 2, y: y + h / 2 }
}

function cellToNode(cell: MxCell): Record<string, unknown> | null {
  if (!cell.vertex) return null
  if (isSwimlaneContainer(cell)) return null
  const lfType = mapDrawioStyleToLfType(cell.style)
  const { x, y } = centerFromTopLeft(cell.x, cell.y, cell.width, cell.height)
  const flags = styleFlags(cell.style)
  const text = decodeXmlEntities(cell.value.replace(/<br\s*\/?>/gi, '\n'))

  const node: Record<string, unknown> = {
    id: `n-${cell.id}`,
    type: lfType,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(cell.width),
    height: Math.round(cell.height),
    text,
    properties: {
      width: Math.round(cell.width),
      height: Math.round(cell.height)
    }
  }

  if (lfType === 'dg-swimlane') {
    node.properties = { dgLane: true, width: cell.width, height: cell.height }
  }

  if (lfType === 'dg-image' && flags.image) {
    if (flags.image.startsWith('data:')) {
      node.properties = { dgAssetUrl: flags.image }
    } else {
      node.properties = { dgDrawioImageSrc: flags.image }
    }
  }

  const props = { ...(node.properties as Record<string, unknown>) }
  if (flags.fillColor && flags.fillColor !== 'none') props.fill = flags.fillColor
  if (flags.strokeColor && flags.strokeColor !== 'none') props.stroke = flags.strokeColor
  if (flags.strokeWidth) props.strokeWidth = Number(flags.strokeWidth)
  if (flags.fontSize) {
    props.textStyle = { fontSize: Number(flags.fontSize) }
  }
  node.properties = normalizeNodeStyleProperties(props)

  return node
}

function cellToEdge(cell: MxCell): Record<string, unknown> | null {
  if (!cell.edge || !cell.source || !cell.target) return null
  const flags = styleFlags(cell.style)
  const dashed = flags.dashed === '1' ? '6 4' : ''
  const edgeType = flags.curved === '1' ? 'bezier' : 'polyline'
  const props: Record<string, unknown> = {}
  if (flags.strokeColor && flags.strokeColor !== 'none') props.stroke = flags.strokeColor
  if (flags.strokeWidth) props.strokeWidth = Number(flags.strokeWidth)
  if (dashed) props.strokeDasharray = dashed
  const endArrow = mapDrawioArrow(flags.endArrow)
  const startArrow = mapDrawioArrow(flags.startArrow)
  if (endArrow) props.endArrowType = endArrow
  if (startArrow && startArrow !== 'none') props.startArrowType = startArrow

  return {
    id: `e-${cell.id}`,
    type: edgeType,
    sourceNodeId: `n-${cell.source}`,
    targetNodeId: `n-${cell.target}`,
    text: decodeXmlEntities(cell.value.replace(/<br\s*\/?>/gi, '\n')),
    properties: normalizeEdgeStyleProperties(props)
  }
}

export function drawioGraphXmlToGraphData(graphXml: string): DiagramGraphData {
  const cells = parseMxCells(graphXml)
  const nodes = cells.map(cellToNode).filter(Boolean) as Record<string, unknown>[]
  const nodeIds = new Set(nodes.map((n) => String(n.id)))
  const edges = cells
    .map(cellToEdge)
    .filter((e): e is Record<string, unknown> => {
      if (!e) return false
      return nodeIds.has(String(e.sourceNodeId)) && nodeIds.has(String(e.targetNodeId))
    })

  return { nodes, edges }
}

/** 从 mxGraphModel 或 diagram 内层 XML 提取各页 */
export function extractDrawioPages(fileXml: string): DrawioParsePage[] {
  const pages: DrawioParsePage[] = []

  if (fileXml.includes('<mxGraphModel')) {
    pages.push({ name: '页1', graphXml: fileXml })
    return pages
  }

  const diagramRe = /<diagram\b([^>]*)>([\s\S]*?)<\/diagram>/g
  let m: RegExpExecArray | null
  while ((m = diagramRe.exec(fileXml))) {
    const attrs = parseAttrString(m[1] ?? '')
    const inner = m[2]?.trim() ?? ''
    const name = attrs.name || `页${pages.length + 1}`
    if (inner.includes('<mxGraphModel') || inner.includes('<mxCell')) {
      pages.push({ name, graphXml: inner })
    }
  }

  return pages
}

export function drawioXmlToDiagramContent(fileXml: string, title: string): DiagramContent {
  const pages = extractDrawioPages(fileXml)
  if (!pages.length) {
    throw new Error('未识别到 draw.io 图形数据')
  }

  const content = createBlankDiagramContent(title)
  content.formatVersion = 2
  content.pages = pages.map((page, index): DiagramPage => ({
    id: `page-${index + 1}`,
    name: page.name,
    sortOrder: index,
    viewport: { x: 0, y: 0, zoom: 1 },
    graphData: drawioGraphXmlToGraphData(page.graphXml)
  }))
  content.meta.defaultPageId = content.pages[0]!.id
  return content
}
