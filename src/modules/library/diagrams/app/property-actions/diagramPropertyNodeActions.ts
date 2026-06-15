import type { DiagramPropertySectionPolicy } from '@modules/library/diagrams/domain/shape-extension/interfaces'
import { roundNodeTopLeft } from '@modules/library/diagrams/lib/diagramNodeLayoutPatch'
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

  function nodeTopLeft(node: { x: number; y: number; width: number; height: number }) {
    return roundNodeTopLeft(node.x, node.y, node.width, node.height)
  }

  function patchNodeLayout(patch: Record<string, unknown>) {
    if (isMultiNode()) {
      void dispatch.dispatchBatchNode(patch)
      return
    }
    const node = getSelectedNode()
    if (!node) return
    dispatch.patchNodeNow(patch)
  }

  /** 仅改左上角 X，Y 不变 */
  function patchNodeLeft(left: number) {
    const node = getSelectedNode()
    if (!node) return
    const nextLeft = Math.round(left)
    if (nextLeft === nodeTopLeft(node).left) return
    patchNodeLayout({ left: nextLeft })
  }

  /** 仅改左上角 Y，X 不变 */
  function patchNodeTop(top: number) {
    const node = getSelectedNode()
    if (!node) return
    const nextTop = Math.round(top)
    if (nextTop === nodeTopLeft(node).top) return
    patchNodeLayout({ top: nextTop })
  }

  /** 仅改宽，面板 X/Y 不变 */
  function patchNodeWidth(width: number) {
    const node = getSelectedNode()
    if (!node) return
    const nextWidth = Math.max(1, Math.round(width))
    if (nextWidth === node.width) return
    patchNodeLayout({ width: nextWidth })
  }

  /** 仅改高，面板 X/Y 不变 */
  function patchNodeHeight(height: number) {
    const node = getSelectedNode()
    if (!node) return
    const nextHeight = Math.max(1, Math.round(height))
    if (nextHeight === node.height) return
    patchNodeLayout({ height: nextHeight })
  }

  function patchNodePositionFromTopLeft(left: number, top: number) {
    patchNodeLeft(left)
    patchNodeTop(top)
  }

  function patchNodeSizeKeepTopLeft(width: number, height: number) {
    patchNodeWidth(width)
    patchNodeHeight(height)
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
    patchNodeLeft,
    patchNodeTop,
    patchNodeWidth,
    patchNodeHeight,
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
