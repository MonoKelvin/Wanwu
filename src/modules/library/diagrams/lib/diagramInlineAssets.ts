import type { DiagramContent, DiagramGraphData } from '@modules/library/diagrams/domain/types'

export interface ExtractedInlineAsset {
  assetId: string
  ext: string
  bytes: Uint8Array
}

type GraphNode = { properties?: Record<string, unknown> } & Record<string, unknown>

const DATA_URL_RE = /^data:image\/([\w+.-]+);base64,([\s\S]+)$/i

function extFromMime(mime: string): string {
  const raw = mime.toLowerCase()
  if (raw === 'jpeg' || raw === 'jpg') return 'jpg'
  if (raw === 'svg+xml') return 'svg'
  if (raw === 'png' || raw === 'webp' || raw === 'gif' || raw === 'svg') return raw
  return 'png'
}

function decodeBase64Payload(b64: string): Uint8Array | null {
  const normalized = b64.replace(/\s/g, '')
  try {
    const binary = atob(normalized)
    const out = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
    return out
  } catch {
    return null
  }
}

export function parseImageDataUrl(dataUrl: string): { ext: string; bytes: Uint8Array } | null {
  const match = dataUrl.trim().match(DATA_URL_RE)
  if (!match) return null
  const bytes = decodeBase64Payload(match[2]!)
  if (!bytes?.length) return null
  return { ext: extFromMime(match[1]!), bytes }
}

function newAssetId(): string {
  return crypto.randomUUID()
}

export function materializeGraphInlineAssets(graph: DiagramGraphData): {
  graph: DiagramGraphData
  assets: ExtractedInlineAsset[]
} {
  const assets: ExtractedInlineAsset[] = []
  const nodes = graph.nodes.map((raw) => {
    const node = raw as GraphNode
    const props = { ...(node.properties ?? {}) }
    const url = props.dgAssetUrl
    if (typeof props.dgAssetId === 'string' && props.dgAssetExt && typeof url === 'string' && url.startsWith('data:')) {
      const { dgAssetUrl: _stale, ...rest } = props
      return { ...node, properties: rest }
    }
    if (typeof url !== 'string' || !url.startsWith('data:')) return node

    const parsed = parseImageDataUrl(url)
    if (!parsed) return node

    const assetId = newAssetId()
    assets.push({ assetId, ext: parsed.ext, bytes: parsed.bytes })
    const { dgAssetUrl: _removed, ...rest } = props
    return {
      ...node,
      properties: {
        ...rest,
        dgAssetId: assetId,
        dgAssetExt: parsed.ext
      }
    }
  })

  return { graph: { ...graph, nodes }, assets }
}

/** 将图中 data URL 图片转为 dgAssetId/dgAssetExt，并收集二进制供落盘 */
export function extractInlineImageAssets(content: DiagramContent): {
  content: DiagramContent
  assets: ExtractedInlineAsset[]
} {
  const allAssets: ExtractedInlineAsset[] = []
  const pages = content.pages.map((page) => {
    const { graph, assets } = materializeGraphInlineAssets(page.graphData)
    allAssets.push(...assets)
    return { ...page, graphData: graph }
  })
  return {
    content: { ...content, pages },
    assets: allAssets
  }
}
