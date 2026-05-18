import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: false
})

export function renderMarkdown(source: string): string {
  const text = source?.trim()
  if (!text) return ''
  return marked.parse(text, { async: false }) as string
}
