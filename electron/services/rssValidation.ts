const URL_PATTERN = /^https?:\/\/.+/i

export function validateFeedTitle(title: string): string | null {
  const t = title.trim()
  if (!t) return '请填写订阅名称'
  if (t.length > 120) return '名称过长（最多 120 字）'
  return null
}

export function validateFeedUrl(url: string): string | null {
  const u = url.trim()
  if (!u) return '请填写 Feed 地址'
  if (!URL_PATTERN.test(u)) return '请输入以 http:// 或 https:// 开头的地址'
  if (u.length > 2048) return '地址过长'
  return null
}
