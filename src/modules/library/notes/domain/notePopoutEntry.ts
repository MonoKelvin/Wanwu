/** 独立便笺窗口启动时 hash 直达 popout 路由，避免先闪主界面 */
export function isNotePopoutHash(): boolean {
  return /^#\/note-popout\//.test(window.location.hash)
}

/** 从 location.hash 解析便笺 id */
export function readPopoutNoteIdFromLocation(): string {
  const m = window.location.hash.match(/^#\/note-popout\/([^/?#]+)/)
  if (!m?.[1]) return ''
  try {
    return decodeURIComponent(m[1])
  } catch {
    return m[1]
  }
}
