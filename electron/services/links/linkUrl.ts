export function normalizeLinkUrl(raw: string): string {
  const t = raw.trim()
  if (!t) throw new Error('链接地址不能为空')
  try {
    const withProto = /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`
    const u = new URL(withProto)
    if (!['http:', 'https:', 'ftp:'].includes(u.protocol)) {
      throw new Error('仅支持 http、https、ftp 协议')
    }
    return u.href
  } catch (e) {
    if (e instanceof Error && e.message.includes('协议')) throw e
    throw new Error('链接地址格式无效')
  }
}

export function isUnreachableUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return !['http:', 'https:', 'ftp:'].includes(u.protocol)
  } catch {
    return true
  }
}
