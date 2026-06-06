import { diagramBodyPlainText } from '@modules/library/diagrams/lib/diagramContentText'
import type { DiagramContent } from '@shared/types/diagrams'
import {
  buildSearchSnippet,
  escapePlainText,
  findMatchRange,
  highlightQueryHtml
} from '@modules/library/notes/lib/noteContentText'

export { highlightQueryHtml }

const escapeHtml = escapePlainText

export interface DiagramSearchDisplay {
  titleHtml: string
  previewHtml: string
  matchedInTitle: boolean
  matchedInContent: boolean
}

export function prepareDiagramSearchDisplay(
  title: string,
  content: DiagramContent | null,
  query: string,
  previewMax = 56
): DiagramSearchDisplay {
  const q = query.trim()
  const titleText = title.trim() || '未命名流程图'
  const bodyPlain = content ? diagramBodyPlainText(content) : ''

  if (!q) {
    const preview = bodyPlain.length > previewMax ? `${bodyPlain.slice(0, previewMax)}…` : bodyPlain
    return {
      titleHtml: escapeHtml(titleText),
      previewHtml: escapeHtml(preview || `${titleText} · 流程图`),
      matchedInTitle: false,
      matchedInContent: false
    }
  }

  const titleMatch = findMatchRange(titleText, q)
  const contentMatch = bodyPlain ? findMatchRange(bodyPlain, q) : null
  const matchedInTitle = titleMatch !== null
  const matchedInContent = contentMatch !== null

  const titleHtml = matchedInTitle ? highlightQueryHtml(titleText, q) : escapeHtml(titleText)

  let previewHtml: string
  if (matchedInContent && bodyPlain) {
    previewHtml = highlightQueryHtml(buildSearchSnippet(bodyPlain, q), q)
  } else if (bodyPlain) {
    const preview = bodyPlain.length > previewMax ? `${bodyPlain.slice(0, previewMax)}…` : bodyPlain
    previewHtml = escapeHtml(preview)
  } else {
    previewHtml = escapeHtml('流程图文档')
  }

  return { titleHtml, previewHtml, matchedInTitle, matchedInContent }
}
