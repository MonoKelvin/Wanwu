import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: false
})

export function renderMarkdown(source: string): string {
  const text = source?.trim()
  if (!text) return ''
  const html = marked.parse(text, { async: false }) as string
  return html.replace(
    /<a href="(https?:\/\/[^"]+)"/g,
    '<a class="ww-md-external-link" href="$1" rel="noopener noreferrer"'
  )
}
