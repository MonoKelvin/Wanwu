import type { DiagramContent } from '@shared/types/diagrams'

function nodeTextValue(text: unknown): string {
  if (typeof text === 'string') return text.trim()
  if (text && typeof text === 'object' && 'value' in text) {
    return String((text as { value?: string }).value ?? '').trim()
  }
  return ''
}

function extractNodeText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const n = node as Record<string, unknown>
  const direct = nodeTextValue(n.text)
  if (direct) return direct
  const props = n.properties as Record<string, unknown> | undefined
  if (props) {
    const fromProps = nodeTextValue(props.text)
    if (fromProps) return fromProps
  }
  return ''
}

/** 画布正文（页名、节点文字，不含文件标题） */
export function diagramBodyPlainText(content: DiagramContent): string {
  const parts: string[] = []
  for (const page of content.pages) {
    if (page.name?.trim()) parts.push(page.name.trim())
    for (const node of page.graphData.nodes) {
      const text = extractNodeText(node)
      if (text) parts.push(text)
    }
    for (const edge of page.graphData.edges) {
      const text = extractNodeText(edge)
      if (text) parts.push(text)
    }
  }
  return parts.join(' ')
}

/** 从流程图内容提取可搜索纯文本（标题、页名、节点文字） */
export function diagramContentPlainText(content: DiagramContent): string {
  const title = content.meta.title?.trim()
  const body = diagramBodyPlainText(content)
  return [title, body].filter(Boolean).join(' ')
}

export function diagramMatchesQuery(title: string, content: DiagramContent | null, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if ((title.trim() || '未命名流程图').toLowerCase().includes(q)) return true
  if (!content) return false
  return diagramBodyPlainText(content).toLowerCase().includes(q)
}
