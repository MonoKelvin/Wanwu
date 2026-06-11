import { computed, inject, provide, ref, type ComputedRef, type InjectionKey, type Ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'
import { useDiagramEditorSelection } from '@modules/library/diagrams/composables/useDiagramEditorSelection'
import { buildPropertyContext } from '@modules/library/diagrams/domain/property-panel/buildPropertyContext'
import type {
  DiagramPropertyContext,
  DiagramPropertyTab
} from '@modules/library/diagrams/domain/property-panel/types'
import type { DiagramCanvasSettings } from '@modules/library/diagrams/lib/diagramSelectionTypes'
import {
  effectiveEdgeCount,
  effectiveNodeCount
} from '@modules/library/diagrams/lib/diagramSelectionSnapshot'
import { useWanwuToast } from '@shared/composables/useWanwuToast'

export interface DiagramPropertyActions {
  isMixed(field: string): boolean
  isTextAlignActive(value: string): boolean
  isFontWeightActive(): boolean
  parseNumber(value: unknown, fallback: number, min?: number, max?: number): number
  nodeTopLeft(node: { x: number; y: number; width: number; height: number }): {
    left: number
    top: number
  }
  patchNode(patch: Record<string, unknown>): void
  patchNodeNow(nodeProps: Record<string, unknown>): void
  patchNodeNumeric(patch: Record<string, unknown>): void
  patchNodeTextStyle(patch: Record<string, unknown>): void
  patchNodePositionFromTopLeft(left: number, top: number): void
  patchNodeSizeKeepTopLeft(width: number, height: number): void
  patchEdge(patch: Record<string, unknown>): void
  dispatchEdgeNumeric(edgeProps: Record<string, unknown>): void
  patchCanvas(patch: Record<string, unknown>): void
  patchDefaultEdge(patch: Record<string, unknown>): void
  patchGroupStyle(patch: Record<string, unknown>): void
  patchGroupAlwaysVisible(value: boolean): void
  toggleUnderline(): void
  toggleItalic(): void
  toggleStrikethrough(): void
  setTextAlign(align: 'left' | 'center' | 'right'): void
  pickNodeImage(): Promise<void>
  clearNodeImage(): void
  hideTextContent(): boolean
  textSectionTitle(): string
}

export interface DiagramPropertyContextApi {
  readonly ctx: ComputedRef<DiagramPropertyContext>
  readonly canvas: ComputedRef<DiagramCanvasSettings>
  readonly imageBusy: Readonly<Ref<boolean>>
  readonly actions: DiagramPropertyActions
}

const propertyContextKey = Symbol('diagramPropertyContext') as InjectionKey<DiagramPropertyContextApi>

export function provideDiagramPropertyContext(
  fileId: Ref<string | null> | ComputedRef<string | null>,
  activeTab: Ref<DiagramPropertyTab>
): DiagramPropertyContextApi {
  const { selection } = useDiagramEditorSelection()
  const bus = useDiagramCommandBus()
  const toast = useWanwuToast()
  const imageBusy = ref(false)

  const ctx = computed(() =>
    buildPropertyContext(activeTab.value, selection.value, fileId.value)
  )

  const canvas = computed(() => selection.value.canvas)
  const multiNode = computed(() => effectiveNodeCount(selection.value) > 1)
  const multiEdge = computed(() => effectiveEdgeCount(selection.value) > 1)

  const selectedNode = computed(() => ctx.value.selectedNode)

  function activeNodeId(): string | null {
    return selectedNode.value?.id ?? null
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
    if (multiNode.value) {
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
    if (multiEdge.value) {
      void bus.dispatch({ type: 'canvas.batchUpdateEdges', payload: { edgeProps } })
      return
    }
    const id = selection.value.edge?.id
    if (!id) return
    void bus.dispatch({ type: 'canvas.updateEdge', payload: { edgeId: id, edgeProps } })
  }

  const dispatchBatchEdge = useDebounceFn((edgeProps: Record<string, unknown>) => {
    void bus.dispatch({ type: 'canvas.batchUpdateEdges', payload: { edgeProps } })
  }, 200)

  const dispatchEdgeText = useDebounceFn((edgeProps: Record<string, unknown>) => {
    const id = selection.value.edge?.id
    if (!id) return
    void bus.dispatch({ type: 'canvas.updateEdge', payload: { edgeId: id, edgeProps } })
  }, 200)

  function patchNode(patch: Record<string, unknown>) {
    if ('text' in patch) {
      if (multiNode.value) void dispatchBatchNode(patch)
      else void dispatchNodeText(patch)
      return
    }
    patchNodeNow(patch)
  }

  function patchDefaultEdge(patch: Record<string, unknown>) {
    patchCanvas({
      defaultEdge: { ...canvas.value.defaultEdge, ...patch }
    })
  }

  function patchNodeTextStyle(patch: Record<string, unknown>) {
    const ts = selectedNode.value?.textStyle
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
      if (multiEdge.value) void dispatchBatchEdge(patch)
      else void dispatchEdgeText(patch)
      return
    }
    patchEdgeNow(patch)
  }

  function patchCanvas(patch: Record<string, unknown>) {
    void bus.dispatch({ type: 'canvas.updateSettings', payload: { settings: patch } })
  }

  function isMixed(field: string): boolean {
    return multiNode.value && selection.value.mixedNodeFields.includes(field)
  }

  function isTextAlignActive(value: string): boolean {
    if (isMixed('textStyle.textAlign')) return false
    return selectedNode.value?.textStyle.textAlign === value
  }

  function isFontWeightActive(): boolean {
    if (isMixed('textStyle.fontWeight')) return false
    return selectedNode.value?.textStyle.fontWeight === 'bold'
  }

  function toggleUnderline() {
    const ts = selectedNode.value?.textStyle
    if (!ts) return
    patchNodeTextStyle({ underline: !ts.underline })
  }

  function toggleItalic() {
    const ts = selectedNode.value?.textStyle
    if (!ts) return
    patchNodeTextStyle({ fontStyle: (ts.fontStyle ?? 'normal') === 'italic' ? 'normal' : 'italic' })
  }

  function toggleStrikethrough() {
    const ts = selectedNode.value?.textStyle
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
    const node = selectedNode.value
    if (!node) return
    patchNodeNumeric({
      x: left + node.width / 2,
      y: top + node.height / 2
    })
  }

  function patchNodeSizeKeepTopLeft(width: number, height: number) {
    const node = selectedNode.value
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
    if (!fileId.value) {
      toast.info('请先保存文档后再插入图片')
      return
    }
    const nodeId = activeNodeId()
    if (!nodeId) return
    imageBusy.value = true
    try {
      const result = await window.wanwu.diagrams.importNodeAsset({ fileId: fileId.value })
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
    const node = selectedNode.value
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
    return ctx.value.sectionPolicy?.hideSections?.['node-text-content'] === true
  }

  function textSectionTitle(): string {
    return ctx.value.sectionPolicy?.textSectionTitle ?? '文本'
  }

  const actions: DiagramPropertyActions = {
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

  const api: DiagramPropertyContextApi = {
    ctx,
    canvas,
    imageBusy,
    actions
  }

  provide(propertyContextKey, api)
  return api
}

export function useDiagramPropertyContext(): DiagramPropertyContextApi {
  const api = inject(propertyContextKey)
  if (!api) {
    throw new Error('useDiagramPropertyContext 需在 provideDiagramPropertyContext 之后使用')
  }
  return api
}
