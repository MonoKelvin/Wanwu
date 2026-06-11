import { useDebounceFn } from '@vueuse/core'
import type { Ref } from 'vue'
import type { DiagramPropertySectionPolicy } from '@modules/library/diagrams/domain/shape-extension/interfaces'
import type { DiagramPropertyActions } from '@modules/library/diagrams/domain/property-panel/types'
import type { IDiagramCommandBus } from '@modules/library/diagrams/interfaces/IDiagramCommandBus'
import type {
  DiagramCanvasSettings,
  DiagramEditorSelection,
  DiagramNodeProperties
} from '@modules/library/diagrams/lib/diagramSelectionTypes'

export interface DiagramPropertyActionsDeps {
  bus: IDiagramCommandBus
  getSelection: () => DiagramEditorSelection
  getSelectedNode: () => DiagramNodeProperties | null | undefined
  getSectionPolicy: () => DiagramPropertySectionPolicy | null | undefined
  getCanvas: () => DiagramCanvasSettings
  isMultiNode: () => boolean
  isMultiEdge: () => boolean
  getFileId: () => string | null
  imageBusy: Ref<boolean>
  toast: {
    info(message: string): void
    error(message: string): void
  }
}

/** 属性面板写操作：通过 command bus 修改画布，与 Section UI 解耦 */
export function createDiagramPropertyActions(deps: DiagramPropertyActionsDeps): DiagramPropertyActions {
  const {
    bus,
    getSelection,
    getSelectedNode,
    getSectionPolicy,
    getCanvas,
    isMultiNode,
    isMultiEdge,
    getFileId,
    imageBusy,
    toast
  } = deps

  function activeNodeId(): string | null {
    return getSelectedNode()?.id ?? null
  }

  const dispatchBatchNode = useDebounceFn((nodeProps: Record<string, unknown>) => {
    void bus.dispatch({ type: 'canvas.batchUpdateNodes', payload: { nodeProps } })
  }, 200)

  const dispatchNodeText = useDebounceFn((nodeProps: Record<string, unknown>) => {
    const id = activeNodeId()
    if (!id) return
    void bus.dispatch({ type: 'canvas.updateNode', payload: { nodeId: id, nodeProps } })
  }, 200)

  function patchNodeNow(nodeProps: Record<string, unknown>) {
    if (isMultiNode()) {
      void bus.dispatch({ type: 'canvas.batchUpdateNodes', payload: { nodeProps } })
      return
    }
    const id = activeNodeId()
    if (!id) return
    void bus.dispatch({ type: 'canvas.updateNode', payload: { nodeId: id, nodeProps } })
  }

  const dispatchNodeNumeric = useDebounceFn((nodeProps: Record<string, unknown>) => {
    patchNodeNow(nodeProps)
  }, 200)

  const dispatchEdgeNumeric = useDebounceFn((edgeProps: Record<string, unknown>) => {
    patchEdgeNow(edgeProps)
  }, 200)

  function patchEdgeNow(edgeProps: Record<string, unknown>) {
    if (isMultiEdge()) {
      void bus.dispatch({ type: 'canvas.batchUpdateEdges', payload: { edgeProps } })
      return
    }
    const id = getSelection().edge?.id
    if (!id) return
    void bus.dispatch({ type: 'canvas.updateEdge', payload: { edgeId: id, edgeProps } })
  }

  const dispatchBatchEdge = useDebounceFn((edgeProps: Record<string, unknown>) => {
    void bus.dispatch({ type: 'canvas.batchUpdateEdges', payload: { edgeProps } })
  }, 200)

  const dispatchEdgeText = useDebounceFn((edgeProps: Record<string, unknown>) => {
    const id = getSelection().edge?.id
    if (!id) return
    void bus.dispatch({ type: 'canvas.updateEdge', payload: { edgeId: id, edgeProps } })
  }, 200)

  function patchNode(patch: Record<string, unknown>) {
    if ('text' in patch) {
      if (isMultiNode()) void dispatchBatchNode(patch)
      else void dispatchNodeText(patch)
      return
    }
    patchNodeNow(patch)
  }

  function patchDefaultEdge(patch: Record<string, unknown>) {
    patchCanvas({
      defaultEdge: { ...getCanvas().defaultEdge, ...patch }
    })
  }

  function patchNodeTextStyle(patch: Record<string, unknown>) {
    const ts = getSelectedNode()?.textStyle
    if (!ts) return
    const next = { ...ts, ...patch }
    if (typeof next.fontSize === 'number') {
      next.fontSize = Math.min(128, Math.max(8, next.fontSize))
    }
    patchNodeNow({ textStyle: next })
  }

  function patchNodeNumeric(patch: Record<string, unknown>) {
    void dispatchNodeNumeric(patch)
  }

  function patchEdge(patch: Record<string, unknown>) {
    if ('text' in patch) {
      if (isMultiEdge()) void dispatchBatchEdge(patch)
      else void dispatchEdgeText(patch)
      return
    }
    patchEdgeNow(patch)
  }

  function patchCanvas(patch: Record<string, unknown>) {
    void bus.dispatch({ type: 'canvas.updateSettings', payload: { settings: patch } })
  }

  function isMixed(field: string): boolean {
    return isMultiNode() && getSelection().mixedNodeFields.includes(field)
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
    const node = getSelectedNode()
    if (!node) return
    const { left, top } = nodeTopLeft(node)
    patchNodeNow({
      width,
      height,
      x: left + width / 2,
      y: top + height / 2
    })
  }

  function parseNumber(value: unknown, fallback: number, min = -Infinity, max = Infinity): number {
    const n = Number(value)
    if (!Number.isFinite(n)) return fallback
    return Math.min(max, Math.max(min, n))
  }

  async function pickNodeImage() {
    const fileId = getFileId()
    if (!fileId) {
      toast.info('请先保存文档后再插入图片')
      return
    }
    const nodeId = activeNodeId()
    if (!nodeId) return
    imageBusy.value = true
    try {
      const result = await window.wanwu.diagrams.importNodeAsset({ fileId })
      if (!result.ok) {
        if (!result.canceled && result.error) toast.error(result.error)
        return
      }
      await bus.dispatch({
        type: 'canvas.updateNode',
        payload: {
          nodeId,
          nodeProps: {
            imageAsset: { assetId: result.assetId, ext: result.ext, url: result.url }
          }
        }
      })
    } finally {
      imageBusy.value = false
    }
  }

  function clearNodeImage() {
    const nodeId = activeNodeId()
    if (!nodeId) return
    void bus.dispatch({
      type: 'canvas.updateNode',
      payload: { nodeId, nodeProps: { imageAsset: null } }
    })
  }

  function patchGroupStyle(patch: Record<string, unknown>) {
    const id = activeNodeId()
    if (!id) return
    const node = getSelectedNode()
    void bus.dispatch({
      type: 'canvas.updateNode',
      payload: {
        nodeId: id,
        patch: {
          properties: {
            dgGroupStyle: {
              stroke: node?.stroke,
              strokeWidth: node?.strokeWidth,
              strokeDasharray: node?.strokeDasharray ?? '',
              fill: node?.fill,
              ...patch
            }
          }
        }
      }
    })
  }

  function patchGroupAlwaysVisible(value: boolean) {
    const id = activeNodeId()
    if (!id) return
    void bus.dispatch({
      type: 'canvas.updateNode',
      payload: {
        nodeId: id,
        patch: {
          properties: {
            dgGroupAlwaysVisible: value
          }
        }
      }
    })
  }

  function hideTextContent(): boolean {
    return getSectionPolicy()?.hideSections?.['node-text-content'] === true
  }

  function textSectionTitle(): string {
    return getSectionPolicy()?.textSectionTitle ?? '文本'
  }

  return {
    isMixed,
    isTextAlignActive,
    isFontWeightActive,
    parseNumber,
    nodeTopLeft,
    patchNode,
    patchNodeNow,
    patchNodeNumeric,
    patchNodeTextStyle,
    patchNodePositionFromTopLeft,
    patchNodeSizeKeepTopLeft,
    patchEdge,
    dispatchEdgeNumeric,
    patchCanvas,
    patchDefaultEdge,
    patchGroupStyle,
    patchGroupAlwaysVisible,
    toggleUnderline,
    toggleItalic,
    toggleStrikethrough,
    setTextAlign,
    pickNodeImage,
    clearNodeImage,
    hideTextContent,
    textSectionTitle
  }
}
