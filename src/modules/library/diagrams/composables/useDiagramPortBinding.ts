import { useDebounceFn } from '@vueuse/core'
import type { Ref } from 'vue'
import type { DiagramEditorSession } from '@modules/library/diagrams/app/DiagramEditorSession'
import type DiagramCanvasContextMenu from '@modules/library/diagrams/components/DiagramCanvasContextMenu.vue'
import type { DiagramEditorSelectionApi } from '@modules/library/diagrams/composables/useDiagramEditorSelection'
import type { LogicFlowDiagramAdapter } from '@modules/library/diagrams/services/LogicFlowDiagramAdapter'
import type { DiagramMultiSelectLayout } from '@modules/library/diagrams/lib/diagramMultiSelectResize'

export interface DiagramPortBindingOptions {
  selectionApi: DiagramEditorSelectionApi
  sessionRef: Ref<DiagramEditorSession | null>
  canvasMenuRef: Ref<InstanceType<typeof DiagramCanvasContextMenu> | null>
  onAlignBarSchedule: () => void
  onOverlayLayout: (layout: DiagramMultiSelectLayout) => void
  onViewportZoomRefresh: () => void
  onGraphDirty: () => void
}

/**
 * 编辑器画布 Port 与 Session / 选区 / 对齐条 / 右键菜单的绑定。
 */
export function useDiagramPortBinding(options: DiagramPortBindingOptions) {
  const {
    selectionApi,
    sessionRef,
    canvasMenuRef,
    onAlignBarSchedule,
    onOverlayLayout,
    onViewportZoomRefresh,
    onGraphDirty
  } = options

  let resizeObserver: ResizeObserver | null = null
  let teardownZoomWheel: (() => void) | null = null
  let resizeRaf = 0
  let zoomWheelRaf = 0

  function wirePortHandlers(port: LogicFlowDiagramAdapter, session: DiagramEditorSession): void {
    port.onEditorSelectionChange((selection) => {
      selectionApi.publish(selection)
      onAlignBarSchedule()
    })

    const syncViewport = useDebounceFn(() => {
      session.syncActivePageViewport()
    }, 300)

    port.onViewportChange(() => {
      void syncViewport()
      onViewportZoomRefresh()
      onAlignBarSchedule()
    })

    port.onOverlayLayoutChange((layout) => {
      onOverlayLayout(layout)
    })

    port.onGraphChange(() => {
      onGraphDirty()
      if (selectionApi.selection.value.selectedNodeCount >= 2) {
        onAlignBarSchedule()
      }
    })

    port.onContextMenu((detail) => {
      const selection = port.getSelection()
      canvasMenuRef.value?.show(
        detail.event,
        {
          kind: detail.kind,
          targetId: detail.targetId,
          nodeIds: detail.nodeIds.length ? detail.nodeIds : selection.selectedNodeIds,
          edgeIds: detail.edgeIds.length ? detail.edgeIds : selection.selectedEdgeIds
        },
        port.hasClipboard(),
        selection.canGroup ?? port.canGroupSelection(),
        selection.canUngroup ?? port.canUngroupSelection()
      )
    })

    selectionApi.publish(port.getSelection())
  }

  function attachCanvasObservers(port: LogicFlowDiagramAdapter, el: HTMLElement): void {
    if (resizeObserver) resizeObserver.disconnect()
    resizeObserver = new ResizeObserver(() => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf)
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0
        port.resize()
        onAlignBarSchedule()
      })
    })
    resizeObserver.observe(el)

    teardownZoomWheel?.()
    const onZoomWheel = () => {
      if (zoomWheelRaf) return
      zoomWheelRaf = requestAnimationFrame(() => {
        zoomWheelRaf = 0
        onViewportZoomRefresh()
        onAlignBarSchedule()
      })
    }
    el.addEventListener('wheel', onZoomWheel, { passive: true })
    teardownZoomWheel = () => el.removeEventListener('wheel', onZoomWheel)
  }

  function dispose() {
    resizeObserver?.disconnect()
    resizeObserver = null
    teardownZoomWheel?.()
    teardownZoomWheel = null
    if (resizeRaf) cancelAnimationFrame(resizeRaf)
    if (zoomWheelRaf) cancelAnimationFrame(zoomWheelRaf)
    resizeRaf = 0
    zoomWheelRaf = 0
  }

  return {
    wirePortHandlers,
    attachCanvasObservers,
    dispose
  }
}
