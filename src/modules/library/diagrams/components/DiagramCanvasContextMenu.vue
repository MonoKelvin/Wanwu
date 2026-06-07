<script setup lang="ts">
import { computed, ref } from 'vue'
import WwContextMenu from '@shared/components/WwContextMenu.vue'
import type { WwMenuItem } from '@shared/types/menu'
import { useDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'
import { DIAGRAM_ALIGN_ACTIONS, DIAGRAM_DISTRIBUTE_ACTIONS } from '@modules/library/diagrams/lib/diagramAlignActions'
import type { DiagramAlignMode, DiagramDistributeMode } from '@modules/library/diagrams/lib/diagramNodeLayout'

export type DiagramCanvasContextTarget = {
  kind: 'node' | 'edge' | 'blank'
  targetId?: string
  nodeIds: string[]
  edgeIds: string[]
}

const bus = useDiagramCommandBus()
const menuRef = ref<InstanceType<typeof WwContextMenu> | null>(null)
const menuEvent = ref<MouseEvent | null>(null)
const clipboardReady = ref(false)
const canUngroup = ref(false)
const target = ref<DiagramCanvasContextTarget>({
  kind: 'blank',
  nodeIds: [],
  edgeIds: []
})

const hasSelection = computed(
  () => target.value.nodeIds.length > 0 || target.value.edgeIds.length > 0
)

function pasteAtCursor() {
  const ev = menuEvent.value
  void bus.dispatch({
    type: 'canvas.paste',
    payload: ev ? { x: ev.clientX, y: ev.clientY } : undefined
  })
}

function duplicateSelection() {
  const { nodeIds, edgeIds } = target.value
  void bus.dispatch({
    type: 'canvas.duplicate',
    payload: { nodeIds, edgeIds }
  })
}

function alignSelection(mode: DiagramAlignMode) {
  void bus.dispatch({ type: 'canvas.alignNodes', payload: { mode } })
}

function distributeSelection(mode: DiagramDistributeMode) {
  void bus.dispatch({ type: 'canvas.distributeNodes', payload: { mode } })
}

const menuItems = computed<WwMenuItem[]>(() => {
  const items: WwMenuItem[] = []
  const { nodeIds, edgeIds } = target.value
  const total = nodeIds.length + edgeIds.length

  if (hasSelection.value) {
    if (nodeIds.length > 0 || edgeIds.length > 0) {
      items.push({
        label: '创建副本',
        wwIcon: 'copy',
        command: () => duplicateSelection()
      })
    }
    items.push(
      { label: '复制', wwIcon: 'copy', command: () => void bus.dispatch({ type: 'canvas.copy' }) },
      {
        label: '粘贴',
        wwIcon: 'square-arrow-up-left',
        disabled: !clipboardReady.value,
        command: () => pasteAtCursor()
      }
    )
    if (total >= 2 && !canUngroup.value) {
      items.push({
        label: '组合',
        wwIcon: 'layers',
        command: () => void bus.dispatch({ type: 'canvas.group' })
      })
    }
    if (canUngroup.value) {
      items.push({
        label: '取消组合',
        wwIcon: 'layers',
        command: () => void bus.dispatch({ type: 'canvas.ungroup' })
      })
    }
    if (nodeIds.length >= 2) {
      items.push({ separator: true })
      for (const action of DIAGRAM_ALIGN_ACTIONS) {
        items.push({
          label: action.label,
          wwIcon: action.icon,
          command: () => alignSelection(action.mode)
        })
      }
    }
    if (nodeIds.length >= 3) {
      for (const action of DIAGRAM_DISTRIBUTE_ACTIONS) {
        items.push({
          label: action.label,
          wwIcon: action.icon,
          command: () => distributeSelection(action.mode)
        })
      }
    }
    if (nodeIds.length > 0) {
      items.push({ separator: true })
      items.push(
        {
          label: '置于顶层',
          wwIcon: 'arrow-up-to-line',
          command: () =>
            void bus.dispatch({
              type: 'canvas.bringToFront',
              payload: { nodeIds }
            })
        },
        {
          label: '置于底层',
          wwIcon: 'arrow-down-from-line',
          command: () =>
            void bus.dispatch({
              type: 'canvas.sendToBack',
              payload: { nodeIds }
            })
        }
      )
    }
    items.push({ separator: true })
    items.push({
      label: '删除',
      wwIcon: 'trash-2',
      command: () =>
        void bus.dispatch({
          type: 'canvas.deleteSelection',
          payload: { nodeIds, edgeIds }
        })
    })
  } else {
    items.push(
      {
        label: '粘贴',
        wwIcon: 'square-arrow-up-left',
        disabled: !clipboardReady.value,
        command: () => pasteAtCursor()
      },
      {
        label: '全选',
        wwIcon: 'layers',
        command: () => void bus.dispatch({ type: 'canvas.selectAll' })
      },
      { separator: true },
      {
        label: '适应画布',
        wwIcon: 'layout-grid',
        command: () => void bus.dispatch({ type: 'canvas.zoomToFit' })
      }
    )
  }

  items.push(
    { separator: true },
    { label: '撤销', wwIcon: 'rotate-ccw', command: () => void bus.dispatch({ type: 'canvas.undo' }) },
    { label: '重做', wwIcon: 'refresh-cw', command: () => void bus.dispatch({ type: 'canvas.redo' }) }
  )

  return items
})

function show(
  event: MouseEvent,
  next: DiagramCanvasContextTarget,
  hasClipboard = false,
  ungroupReady = false
) {
  event.preventDefault()
  menuEvent.value = event
  target.value = next
  clipboardReady.value = hasClipboard
  canUngroup.value = ungroupReady
  void menuRef.value?.show(event)
}

defineExpose({ show })
</script>

<template>
  <WwContextMenu ref="menuRef" :model="menuItems" />
</template>
