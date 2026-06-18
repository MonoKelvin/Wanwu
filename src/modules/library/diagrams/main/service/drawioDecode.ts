import { inflateRaw } from 'node:zlib'

/** draw.io 文件外层 XML → 可解析的 mxGraph XML 文本 */
export function decodeDrawioFileContent(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.includes('<mxGraphModel')) return trimmed

  const diagramRe = /<diagram\b([^>]*)>([\s\S]*?)<\/diagram>/g
  let result = trimmed
  let m: RegExpExecArray | null
  let replaced = false

  while ((m = diagramRe.exec(trimmed))) {
    const attrs = m[1] ?? ''
    const inner = m[2]?.trim() ?? ''
    if (!inner || inner.startsWith('<')) continue

    const decoded = decodeDiagramPayload(inner)
    const nameMatch = attrs.match(/name=("([^"]*)"|'([^']*)')/)
    const name = nameMatch?.[2] ?? nameMatch?.[3] ?? '页1'
    const replacement = `<diagram ${attrs.trim()}>${decoded}</diagram>`
    result = result.replace(m[0], replacement)
    replaced = true
  }

  if (replaced) return result
  if (!trimmed.startsWith('<')) {
    return decodeDiagramPayload(trimmed)
  }
  return trimmed
}

function decodeDiagramPayload(data: string): string {
  const normalized = decodeURIComponent(data.trim())
  if (normalized.startsWith('<')) return normalized

  try {
    const buf = Buffer.from(normalized, 'base64')
    const inflated = inflateRaw(buf)
    return inflated.toString('utf8')
  } catch {
    return normalized
  }
}
