<script setup lang="ts">
import { computed, ref } from 'vue'
import WwContextMenu from '@shared/components/WwContextMenu.vue'
import type { WwMenuItem } from '@shared/types/menu'
import { useDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'

export type DiagramCanvasContextTarget = {
  kind: 'node' | 'edge' | 'blank'
  targetId?: string
  nodeIds: string[]
  edgeIds: string[]
}

const bus = useDiagramCommandBus()
const menuRef = ref<InstanceType<typeof WwContextMenu> | null>(null)
const menuEvent = ref<MouseEvent | null>(null)
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

const menuItems = computed<WwMenuItem[]>(() => {
  const items: WwMenuItem[] = []
  const { nodeIds, edgeIds } = target.value

  if (hasSelection.value) {
    items.push(
      { label: '复制', wwIcon: 'copy', command: () => void bus.dispatch({ type: 'canvas.copy' }) },
      {
        label: '粘贴',
        wwIcon: 'copy',
        command: () => pasteAtCursor()
      },
      { separator: true },
      {
        label: '删除',
        wwIcon: 'trash-2',
        command: () =>
          void bus.dispatch({
            type: 'canvas.deleteSelection',
            payload: { nodeIds, edgeIds }
          })
      }
    )
    if (nodeIds.length === 1 && !edgeIds.length) {
      items.unshift({
        label: '创建副本',
        wwIcon: 'copy',
        command: () => void duplicateSelection()
      })
    }
  } else {
    items.push(
      {
        label: '粘贴',
        wwIcon: 'copy',
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

async function duplicateSelection() {
  await bus.dispatch({ type: 'canvas.copy' })
  pasteAtCursor()
}

function show(event: MouseEvent, next: DiagramCanvasContextTarget) {
  event.preventDefault()
  menuEvent.value = event
  target.value = next
  void menuRef.value?.show(event)
}

defineExpose({ show })
</script>

<template>
  <WwContextMenu ref="menuRef" :model="menuItems" />
</template>
