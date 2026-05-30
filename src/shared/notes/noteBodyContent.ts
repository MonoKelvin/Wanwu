/** 从便笺正文 HTML 收集引用的图片 id（data-image-id） */
export function collectNoteImageIdsFromHtml(html: string): Set<string> {
  const ids = new Set<string>()
  if (!html) return ids
  const re = /data-image-id=["']([^"']+)["']/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html)) !== null) {
    const id = match[1]?.trim()
    if (id) ids.add(id)
  }
  return ids
}

/** 便笺 HTML 正文转纯文本 */
export function noteContentPlainText(content: string): string {
  if (!content) return ''
  return content
    .replace(/<img\b[^>]*>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

/** 折叠空白，便于搜索与摘要定位 */
export function normalizeNotePlainText(content: string): string {
  return noteContentPlainText(content).replace(/\s+/g, ' ').trim()
}

/** 便笺正文是否无实质内容（无文字且无图片节点） */
export function isNoteBodyEmpty(content: string): boolean {
  const trimmed = content.trim()
  if (!trimmed) return true
  if (collectNoteImageIdsFromHtml(content).size > 0) return false
  return !normalizeNotePlainText(content)
}

/**
 * 落盘 / 脏检查用的正文 canonical 形式：空正文统一为 ''。
 * 避免编辑器 `<p></p>` 与数据库 '' 不一致导致无法保存清空操作。
 */
export function canonicalNoteBodyContent(content: string): string {
  if (isNoteBodyEmpty(content)) return ''
  return content
}
