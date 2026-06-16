<script setup lang="ts">
import { computed, ref } from 'vue'
import WwContextMenu from '@shared/components/WwContextMenu.vue'
import type { WwMenuItem } from '@shared/types/menu'
import { ensureDiagramShapeExtensions } from '@modules/library/diagrams/app/diagramShapeExtensions'
import type { DiagramContextMenuContributionContext } from '@modules/library/diagrams/domain/shape-extension/canvasInteractionTypes'
import { useDiagramCanvasCommands } from '@modules/library/diagrams/composables/useDiagramCanvasCommands'
import { useDiagramCanvasClipboard } from '@modules/library/diagrams/composables/useDiagramCanvasClipboard'
import { getDiagramEditorRuntime } from '@modules/library/diagrams/composables/useDiagramEditorRuntime'
import { DG_SHORTCUT } from '@modules/library/diagrams/lib/diagramKeyboardShortcuts'

export type DiagramCanvasContextTarget = {
  kind: 'node' | 'edge' | 'blank'
  targetId?: string
  nodeIds: string[]
  edgeIds: string[]
  event?: MouseEvent
}

const canvas = useDiagramCanvasCommands()
const clipboard = useDiagramCanvasClipboard()
const menuRef = ref<InstanceType<typeof WwContextMenu> | null>(null)
const clipboardReady = ref(false)
const canUngroup = ref(false)
const canGroup = ref(false)
const target = ref<DiagramCanvasContextTarget>({
  kind: 'blank',
  nodeIds: [],
  edgeIds: []
})

const hasSelection = computed(
  () => target.value.nodeIds.length > 0 || target.value.edgeIds.length > 0
)

function pasteAtCursor() {
  clipboard.paste()
}

function buildExtensionContext(): DiagramContextMenuContributionContext {
  const { nodeIds, edgeIds, kind, event } = target.value
  return {
    targetKind: kind,
    nodeIds,
    edgeIds,
    event,
    getLf: () => getDiagramEditorRuntime().port?.getLogicFlow() ?? null,
    modifyNode: (nodeId, patch) => canvas.modifyNode({ nodeId, patch })
  }
}

const menuItems = computed<WwMenuItem[]>(() => {
  const items: WwMenuItem[] = []
  const { nodeIds, edgeIds } = target.value

  if (hasSelection.value) {
    items.push(
      {
        label: '复制',
        wwIcon: 'copy',
        shortcut: DG_SHORTCUT.copy,
        command: () => clipboard.copy()
      },
      {
        label: '粘贴',
        wwIcon: 'clipboard-paste',
        shortcut: DG_SHORTCUT.paste,
        disabled: !clipboardReady.value,
        command: () => pasteAtCursor()
      }
    )
    items.push({
      label: '组合',
      wwIcon: 'layers',
      shortcut: DG_SHORTCUT.group,
      disabled: !canGroup.value,
      command: () => canvas.group()
    })
    items.push({
      label: '取消组合',
      wwIcon: 'ungroup',
      shortcut: DG_SHORTCUT.ungroup,
      disabled: !canUngroup.value,
      command: () => canvas.ungroup()
    })
    if (nodeIds.length > 0) {
      items.push({ separator: true })
      items.push(
        {
          label: '置于顶层',
          wwIcon: 'arrow-up-to-line',
          command: () => canvas.bringToFront(nodeIds)
        },
        {
          label: '置于底层',
          wwIcon: 'arrow-down-from-line',
          command: () => canvas.sendToBack(nodeIds)
        }
      )
    }

    const extensionItems = ensureDiagramShapeExtensions().collectContextMenuItems(
      buildExtensionContext()
    )
    if (extensionItems.length) {
      items.push({ separator: true })
      items.push(...(extensionItems as WwMenuItem[]))
    }

    items.push({ separator: true })
    items.push({
      label: '删除',
      wwIcon: 'trash-2',
      shortcut: DG_SHORTCUT.delete,
      command: () => canvas.deleteSelection({ nodeIds, edgeIds })
    })
  } else {
    items.push(
      {
        label: '粘贴',
        wwIcon: 'clipboard-paste',
        shortcut: DG_SHORTCUT.paste,
        disabled: !clipboardReady.value,
        command: () => pasteAtCursor()
      },
      {
        label: '全选',
        wwIcon: 'layers',
        shortcut: DG_SHORTCUT.selectAll,
        command: () => canvas.selectAll()
      },
      { separator: true },
      {
        label: '适应画布',
        wwIcon: 'layout-grid',
        shortcut: DG_SHORTCUT.zoomFit,
        command: () => canvas.zoomToFit()
      }
    )
  }

  return items
})

function show(
  event: MouseEvent,
  next: DiagramCanvasContextTarget,
  hasClipboard = false,
  groupReady = false,
  ungroupReady = false
) {
  event.preventDefault()
  target.value = { ...next, event }
  clipboardReady.value = hasClipboard
  canGroup.value = groupReady
  canUngroup.value = ungroupReady
  void menuRef.value?.show(event)
}

defineExpose({ show })
</script>

<template>
  <WwContextMenu ref="menuRef" :model="menuItems" />
</template>
