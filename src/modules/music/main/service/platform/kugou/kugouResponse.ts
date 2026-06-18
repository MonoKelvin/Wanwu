/** 解析酷狗 API 可能返回的 HTML 包裹 JSON */
export function parseKugouJsonBody(body: unknown): unknown {
  if (typeof body !== 'string') return body
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(body.slice(start, end + 1))
    } catch {
      return body
    }
  }
  return body
}

function firstHttpUrl(value: unknown): string | undefined {
  if (typeof value === 'string' && value.startsWith('http')) return value
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string' && item.startsWith('http')) return item
    }
  }
  return undefined
}

/** 从 song/url 等接口提取可播放地址（文档：/song/url） */
export function pickKugouStreamUrl(body: unknown): string | undefined {
  const root = parseKugouJsonBody(body) as Record<string, unknown>
  const fromRoot = firstHttpUrl(root.url) ?? firstHttpUrl(root.backupUrl)
  if (fromRoot) return fromRoot

  const data = root.data
  if (typeof data === 'string' && data.startsWith('http')) return data
  if (Array.isArray(data)) {
    for (const item of data) {
      const row = item as Record<string, unknown>
      const url = firstHttpUrl(row.url) ?? firstHttpUrl(row.play_url) ?? firstHttpUrl(row.playUrl)
      if (url) return url
    }
  }
  if (data && typeof data === 'object') {
    const row = data as Record<string, unknown>
    const url = firstHttpUrl(row.url) ?? firstHttpUrl(row.play_url) ?? firstHttpUrl(row.playUrl)
    if (url) return url
  }
  return undefined
}
