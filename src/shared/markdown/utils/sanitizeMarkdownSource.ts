/** 移除 AI 生成 Markdown 中残留的 cite 私用区乱码标记 */
export function stripCorruptCitationMarkers(text: string): string {
  if (!text) return ''
  return text
    .replace(/\uE3A0cite(?:\uE3A3web_search:\d+#\d+)+\uE3A8?/g, '')
    .replace(/[\uE000-\uF8FF]/g, '')
}

/** 修复历史 content / 描述中重复的 **** 加粗 */
export function normalizeMarkdownLabels(text: string): string {
  if (!text?.trim()) return ''
  return stripCorruptCitationMarkers(text)
    .replace(/\*{4,}([^*]+?)\*{4,}/g, '**$1**')
    .replace(/\*{3}([^*]+?)\*{3}/g, '**$1**')
}
