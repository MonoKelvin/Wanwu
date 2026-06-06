import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, extname, isAbsolute, resolve } from 'node:path'
import type { DiagramContent } from '../../../src/shared/types/diagrams'

type GraphNode = { properties?: Record<string, unknown> } & Record<string, unknown>

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml'
}

function mimeForExt(ext: string): string {
  return MIME_BY_EXT[ext.toLowerCase()] ?? 'image/png'
}

/** 将 draw.io style 中的 image= 路径解析为本地绝对路径 */
export function resolveDrawioImagePath(imageRef: string, sourceDir: string): string | null {
  const ref = imageRef.trim()
  if (!ref || ref.startsWith('data:')) return null

  let candidate = ref
  if (candidate.startsWith('file://')) {
    try {
      candidate = decodeURIComponent(new URL(candidate).pathname)
      if (/^\/[A-Za-z]:/.test(candidate)) candidate = candidate.slice(1)
    } catch {
      return null
    }
  }

  candidate = candidate.replace(/\\/g, '/')
  const abs = isAbsolute(candidate) ? candidate : resolve(sourceDir, candidate)
  return existsSync(abs) ? abs : null
}

async function fileToDataUrl(absPath: string): Promise<string | null> {
  try {
    const ext = extname(absPath).slice(1).toLowerCase() || 'png'
    const buf = await readFile(absPath)
    const mime = mimeForExt(ext)
    const b64 = buf.toString('base64')
    return `data:${mime};base64,${b64}`
  } catch {
    return null
  }
}

/** 将 draw.io 外部图片引用转为 data URL，供后续 assets 落盘 */
export async function embedDrawioExternalImages(
  content: DiagramContent,
  sourcePath: string
): Promise<DiagramContent> {
  const sourceDir = dirname(sourcePath)
  const pages = await Promise.all(
    content.pages.map(async (page) => {
      const nodes = await Promise.all(
        page.graphData.nodes.map(async (raw) => {
          const node = raw as GraphNode
          const props = { ...(node.properties ?? {}) }
          const ref = props.dgDrawioImageSrc
          if (typeof ref !== 'string' || !ref) return node

          const abs = resolveDrawioImagePath(ref, sourceDir)
          if (!abs) return node

          const dataUrl = await fileToDataUrl(abs)
          if (!dataUrl) return node

          const { dgDrawioImageSrc: _removed, ...rest } = props
          return {
            ...node,
            properties: { ...rest, dgAssetUrl: dataUrl }
          }
        })
      )
      return { ...page, graphData: { ...page.graphData, nodes } }
    })
  )
  return { ...content, pages }
}
