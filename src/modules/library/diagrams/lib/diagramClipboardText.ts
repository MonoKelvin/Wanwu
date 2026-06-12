/** 将 LogicFlow 节点/连线 text 字段转为剪贴板字符串 */
export function lfTextToClipboardString(text: unknown): string | undefined {
  if (typeof text === 'string') return text || undefined
  if (text && typeof text === 'object' && 'value' in text) {
    const value = String((text as { value?: string }).value ?? '')
    return value || undefined
  }
  return undefined
}
