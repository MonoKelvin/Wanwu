/** 解析 kugoumusicapi 返回的 cookie 字符串数组（如 token=xxx） */
export function parseKugouCookieStrings(rows: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const row of rows) {
    if (!row || typeof row !== 'string') continue
    const eq = row.indexOf('=')
    if (eq <= 0) continue
    const key = row.slice(0, eq).trim()
    out[key] = row.slice(eq + 1)
  }
  return out
}

export const KUGOU_DEVICE_COOKIE_DEFAULTS = {
  KUGOU_API_DEV: 'WANWU00001',
  KUGOU_API_MAC: '02:00:00:00:00:00'
} as const

export function buildKugouRequestCookie(input: {
  kugouCookies?: Record<string, string>
  kugouGuid?: string
  kugouMid?: string
  dfid?: string
  musicU?: string
  userId?: number
}): Record<string, string> {
  const jar: Record<string, string> = {
    userid: '0',
    token: '',
    ...KUGOU_DEVICE_COOKIE_DEFAULTS,
    ...(input.kugouCookies ?? {})
  }

  if (input.kugouGuid) jar.KUGOU_API_GUID = input.kugouGuid
  if (input.kugouMid) jar.KUGOU_API_MID = input.kugouMid
  if (input.dfid) jar.dfid = input.dfid

  const token = input.musicU ?? jar.token
  if (token) {
    jar.token = token
    jar.userid = input.userId ? String(input.userId) : jar.userid || '0'
  } else {
    jar.userid = jar.userid ?? '0'
    jar.token = jar.token ?? ''
  }

  return jar
}
