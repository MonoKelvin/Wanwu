import type { DiagramGraphData } from '@modules/library/diagrams/domain/types'

export function buildDiagramAssetRelPath(fileId: string, assetId: string, ext: string): string {
  return `diagrams/${fileId}/assets/${assetId}.${ext}`
}

export function buildDiagramAssetUrl(fileId: string, assetId: string, ext: string): string {
  return `wanwu-media://${encodeURI(buildDiagramAssetRelPath(fileId, assetId, ext))}`
}

type GraphNode = { properties?: Record<string, unknown> } & Record<string, unknown>

export function hydrateDiagramGraphAssets(
  graph: DiagramGraphData,
  fileId: string | null
): DiagramGraphData {
  if (!fileId) return graph
  const nodes = graph.nodes.map((raw) => {
    const node = raw as GraphNode
    const props = { ...(node.properties ?? {}) }
    const assetId = props.dgAssetId
    const ext = props.dgAssetExt
    if (typeof assetId === 'string' && typeof ext === 'string' && assetId && ext) {
      props.dgAssetUrl = buildDiagramAssetUrl(fileId, assetId, ext)
    }
    return { ...node, properties: props }
  })
  return { ...graph, nodes }
}

export function stripTransientAssetUrls(graph: DiagramGraphData): DiagramGraphData {
  const nodes = graph.nodes.map((raw) => {
    const node = raw as GraphNode
    const props = node.properties
    if (!props?.dgAssetUrl && !props?.dgDrawioImageSrc) return node
    const { dgAssetUrl: _removed, dgDrawioImageSrc: _src, ...rest } = props
    return { ...node, properties: rest }
  })
  return { ...graph, nodes }
}

export function readNodeImageAsset(
  properties: Record<string, unknown> | undefined
): { assetId: string; ext: string; url: string } | null {
  if (!properties) return null
  const assetId = properties.dgAssetId
  const ext = properties.dgAssetExt
  const url = properties.dgAssetUrl
  if (typeof assetId !== 'string' || typeof ext !== 'string' || !assetId || !ext) return null
  return {
    assetId,
    ext,
    url: typeof url === 'string' ? url : ''
  }
}
