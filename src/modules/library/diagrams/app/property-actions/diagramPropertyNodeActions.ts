import type { DiagramPropertySectionPolicy } from '@modules/library/diagrams/domain/shape-extension/interfaces'
import type { DiagramNodeProperties } from '@modules/library/diagrams/lib/diagramSelectionTypes'
import type { DiagramPropertyCommandDispatch } from '@modules/library/diagrams/app/property-actions/diagramPropertyCommandDispatch'

export interface DiagramPropertyNodeActionsDeps {
  dispatch: DiagramPropertyCommandDispatch
  getSelectedNode: () => DiagramNodeProperties | null | undefined
  getSectionPolicy: () => DiagramPropertySectionPolicy | null | undefined
  isMultiNode: () => boolean
  isMixed: (field: string) => boolean
}

export function createDiagramPropertyNodeActions(deps: DiagramPropertyNodeActionsDeps) {
  const { dispatch, getSelectedNode, getSectionPolicy, isMultiNode, isMixed } = deps

  function patchNode(patch: Record<string, unknown>) {
    if ('text' in patch) {
      if (isMultiNode()) void dispatch.dispatchBatchNode(patch)
      else void dispatch.dispatchNodeText(patch)
      return
    }
    dispatch.patchNodeNow(patch)
  }

  function patchNodeTextStyle(patch: Record<string, unknown>) {
    const ts = getSelectedNode()?.textStyle
    if (!ts) return
    const next = { ...ts, ...patch }
    if (typeof next.fontSize === 'number') {
      next.fontSize = Math.min(128, Math.max(8, next.fontSize))
    }
    dispatch.patchNodeNow({ textStyle: next })
  }

  function patchNodeNumeric(patch: Record<string, unknown>) {
    void dispatch.dispatchNodeNumeric(patch)
  }

  function isTextAlignActive(value: string): boolean {
    if (isMixed('textStyle.textAlign')) return false
    return getSelectedNode()?.textStyle.textAlign === value
  }

  function isFontWeightActive(): boolean {
    if (isMixed('textStyle.fontWeight')) return false
    return getSelectedNode()?.textStyle.fontWeight === 'bold'
  }

  function toggleUnderline() {
    const ts = getSelectedNode()?.textStyle
    if (!ts) return
    patchNodeTextStyle({ underline: !ts.underline })
  }

  function toggleItalic() {
    const ts = getSelectedNode()?.textStyle
    if (!ts) return
    patchNodeTextStyle({ fontStyle: (ts.fontStyle ?? 'normal') === 'italic' ? 'normal' : 'italic' })
  }

  function toggleStrikethrough() {
    const ts = getSelectedNode()?.textStyle
    if (!ts) return
    patchNodeTextStyle({ strikethrough: !ts.strikethrough })
  }

  function setTextAlign(align: 'left' | 'center' | 'right') {
    patchNodeTextStyle({ textAlign: align })
  }

  function nodeTopLeft(node: { x: number; y: number; width: number; height: number }) {
    return {
      left: Math.round(node.x - node.width / 2),
      top: Math.round(node.y - node.height / 2)
    }
  }

  function patchNodePositionFromTopLeft(left: number, top: number) {
    const node = getSelectedNode()
    if (!node) return
    patchNodeNumeric({
      x: left + node.width / 2,
      y: top + node.height / 2
    })
  }

  function patchNodeSizeKeepTopLeft(width: number, height: number) {
    if (!getSelectedNode()) return
    dispatch.patchNodeNow({ width, height })
  }

  function hideTextContent(): boolean {
    return getSectionPolicy()?.hideSections?.['node-text-content'] === true
  }

  function textSectionTitle(): string {
    return getSectionPolicy()?.textSectionTitle ?? '文本'
  }

  return {
    patchNode,
    patchNodeNow: dispatch.patchNodeNow,
    patchNodeNumeric,
    patchNodeTextStyle,
    patchNodePositionFromTopLeft,
    patchNodeSizeKeepTopLeft,
    isTextAlignActive,
    isFontWeightActive,
    toggleUnderline,
    toggleItalic,
    toggleStrikethrough,
    setTextAlign,
    nodeTopLeft,
    hideTextContent,
    textSectionTitle
  }
}
