import { diagramBodyPlainText } from '@modules/library/diagrams/lib/diagramContentText'
import type { DiagramContent } from '@shared/types/diagrams'
import {
  formatDiagramFileName,
  diagramTitleBase
} from '@modules/library/diagrams/lib/diagramHomeUtils'
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
  options?: { previewMax?: number; contentPreviewPlain?: string }
): DiagramSearchDisplay {
  const previewMax = options?.previewMax ?? 56
  const q = query.trim()
  const titleText = formatDiagramFileName(title)
  const titleBase = diagramTitleBase(title)
  const bodyPlain =
    options?.contentPreviewPlain ?? (content ? diagramBodyPlainText(content) : '')

  if (!q) {
    const preview = bodyPlain.length > previewMax ? `${bodyPlain.slice(0, previewMax)}…` : bodyPlain
    return {
      titleHtml: escapeHtml(titleText),
      previewHtml: escapeHtml(preview || `${titleBase}.wfg`),
      matchedInTitle: false,
      matchedInContent: false
    }
  }

  const titleMatch =
    findMatchRange(titleText, q) ?? findMatchRange(titleBase, q)
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
