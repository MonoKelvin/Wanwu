import { ref, type Ref } from 'vue'
import type { DiagramAlignBarAnchor } from '@modules/library/diagrams/lib/diagramAlignBarTypes'
import type { LogicFlowDiagramAdapter } from '@modules/library/diagrams/services/LogicFlowDiagramAdapter'
import type { DiagramMultiSelectLayout } from '@modules/library/diagrams/lib/diagramMultiSelectResize'

function alignBarRectsClose(
  a: DiagramAlignBarAnchor,
  b: DiagramAlignBarAnchor,
  epsilon = 1.5
): boolean {
  return (
    Math.abs(a.left - b.left) < epsilon &&
    Math.abs(a.top - b.top) < epsilon &&
    Math.abs(a.width - b.width) < epsilon &&
    Math.abs(a.height - b.height) < epsilon
  )
}

/**
 * 画布多选对齐条：锚点、舞台尺寸与 rAF 节流刷新。
 * 由 DiagramEditorView 挂载，overlay 布局与选区变更时更新。
 */
export function useDiagramAlignBar(canvasWrapRef: Ref<HTMLElement | null>) {
  const nodeCount = ref(0)
  const anchor = ref<DiagramAlignBarAnchor | null>(null)
  const stageWidth = ref(0)
  const stageHeight = ref(600)

  let alignBarRaf = 0

  function applyLayout(rect: DiagramAlignBarAnchor | null, count: number) {
    nodeCount.value = count
    if (!rect) {
      anchor.value = null
      return
    }
    const prev = anchor.value
    if (prev && alignBarRectsClose(prev, rect)) return
    anchor.value = rect
  }

  function refreshFromPort(port: LogicFlowDiagramAdapter | null) {
    const wrap = canvasWrapRef.value
    if (wrap) {
      stageWidth.value = wrap.clientWidth
      stageHeight.value = wrap.clientHeight
    }
    if (!port) {
      nodeCount.value = 0
      anchor.value = null
      return
    }
    const liveCount = port.getSelection().selectedNodeCount
    nodeCount.value = liveCount
    if (liveCount < 2) {
      anchor.value = null
      return
    }
    anchor.value = port.getMultiSelectOverlayRect()
  }

  function scheduleRefresh(port: Ref<LogicFlowDiagramAdapter | null>) {
    if (alignBarRaf) cancelAnimationFrame(alignBarRaf)
    alignBarRaf = requestAnimationFrame(() => {
      alignBarRaf = 0
      refreshFromPort(port.value)
    })
  }

  function applyOverlayLayout(layout: DiagramMultiSelectLayout) {
    applyLayout(layout.rect, layout.nodeCount)
  }

  function dispose() {
    if (alignBarRaf) cancelAnimationFrame(alignBarRaf)
    alignBarRaf = 0
  }

  return {
    nodeCount,
    anchor,
    stageWidth,
    stageHeight,
    applyLayout,
    applyOverlayLayout,
    refreshFromPort,
    scheduleRefresh,
    dispose
  }
}
