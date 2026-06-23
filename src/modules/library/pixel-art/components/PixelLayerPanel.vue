<script setup lang="ts">
import { computed, ref } from 'vue'
import WwIconButton from '@shared/components/WwIconButton.vue'
import WwContextMenu from '@shared/components/WwContextMenu.vue'
import type { WwMenuItem } from '@shared/types/menu'
import type { PixelDocument } from '@modules/library/pixel-art/domain/types'
import { PixelCmd, type IPixelCommandBus } from '@modules/library/pixel-art/app/command/PixelCommandRegistry'
import { getActiveFrame } from '@modules/library/pixel-art/lib/blankDocument'
import { hasPixelLayerClipboard } from '@modules/library/pixel-art/lib/pixelLayerClipboard'

const props = defineProps<{
  document: PixelDocument | null
  bus?: IPixelCommandBus | null
}>()

const selectedIds = ref<string[]>([])
const renamingId = ref<string | null>(null)
const renameValue = ref('')
const dragLayerId = ref<string | null>(null)
const dropDisplayIndex = ref<number | null>(null)
const menuRef = ref<InstanceType<typeof WwContextMenu> | null>(null)
const menuItems = ref<WwMenuItem[]>([])
let menuLayerId = ''

const layers = computed(() => {
  if (!props.document) return []
  return getActiveFrame(props.document).layers.slice().reverse()
})

const activeLayerId = computed(() => props.document?.meta.activeLayerId ?? '')

function dispatch(type: string, payload?: Record<string, unknown>) {
  if (props.bus) void props.bus.dispatch({ type, payload })
}

function isSelected(id: string) {
  return selectedIds.value.includes(id)
}

function onRowClick(layerId: string, e: MouseEvent) {
  const list = layers.value.map((l) => l.id)
  if (e.shiftKey && activeLayerId.value) {
    const a = list.indexOf(activeLayerId.value)
    const b = list.indexOf(layerId)
    if (a >= 0 && b >= 0) {
      const [start, end] = a < b ? [a, b] : [b, a]
      selectedIds.value = list.slice(start, end + 1)
    } else {
      selectedIds.value = [layerId]
    }
  } else if (e.ctrlKey || e.metaKey) {
    selectedIds.value = isSelected(layerId)
      ? selectedIds.value.filter((id) => id !== layerId)
      : [...selectedIds.value, layerId]
  } else {
    selectedIds.value = [layerId]
  }
  dispatch(PixelCmd.Layer.SetActive, { layerId })
}

function addLayer() {
  dispatch(PixelCmd.Layer.Add)
}

function deleteLayer(layerId: string) {
  dispatch(PixelCmd.Layer.Delete, { layerId })
  selectedIds.value = selectedIds.value.filter((id) => id !== layerId)
}

function startRename(layerId: string, name: string) {
  renamingId.value = layerId
  renameValue.value = name
}

function commitRename(layerId: string) {
  const name = renameValue.value.trim()
  if (name) dispatch(PixelCmd.Layer.Rename, { layerId, name })
  renamingId.value = null
}

function toggleLayerVisible(layerId: string, visible: boolean) {
  dispatch(PixelCmd.Layer.SetVisible, { layerId, visible: !visible })
}

function toggleLayerLocked(layerId: string, locked: boolean) {
  dispatch(PixelCmd.Layer.SetLocked, { layerId, locked: !locked })
}

function orderIndexFromDisplay(displayIndex: number): number {
  const total = layers.value.length
  return Math.max(0, total - 1 - displayIndex)
}

function reorderLayer(layerId: string, displayIndex: number) {
  dispatch(PixelCmd.Layer.Reorder, { layerId, newIndex: orderIndexFromDisplay(displayIndex) })
}

function onDragStart(layerId: string, e: DragEvent) {
  dragLayerId.value = layerId
  if (!isSelected(layerId)) selectedIds.value = [layerId]
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', layerId)
  }
}

function onDragOver(displayIndex: number, e: DragEvent) {
  e.preventDefault()
  dropDisplayIndex.value = displayIndex
}

function onDrop(displayIndex: number) {
  const id = dragLayerId.value
  dragLayerId.value = null
  dropDisplayIndex.value = null
  if (!id) return
  reorderLayer(id, displayIndex)
}

function onDragEnd() {
  dragLayerId.value = null
  dropDisplayIndex.value = null
}

function targetLayerIds(): string[] {
  if (selectedIds.value.length) return selectedIds.value
  return menuLayerId ? [menuLayerId] : []
}

function openLayerMenu(event: MouseEvent, layerId: string) {
  event.preventDefault()
  menuLayerId = layerId
  if (!selectedIds.value.includes(layerId)) selectedIds.value = [layerId]

  const ids = targetLayerIds()
  const canPaste = hasPixelLayerClipboard()
  menuItems.value = [
    {
      label: '重命名',
      disabled: ids.length !== 1,
      command: () => {
        const id = ids[0]!
        const layer = layers.value.find((l) => l.id === id)
        if (layer) startRename(id, layer.name)
      }
    },
    {
      label: '复制',
      disabled: ids.length !== 1,
      command: () => dispatch(PixelCmd.Layer.Copy, { layerId: ids[0] })
    },
    {
      label: '粘贴',
      disabled: !canPaste,
      command: () => dispatch(PixelCmd.Layer.Paste)
    },
    {
      label: '复制图层',
      disabled: ids.length !== 1,
      command: () => dispatch(PixelCmd.Layer.Duplicate, { layerId: ids[0] })
    },
    {
      label: '合并图层',
      disabled: ids.length < 2,
      command: () => dispatch(PixelCmd.Layer.Merge, { layerIds: ids })
    },
    { separator: true, label: '' },
    {
      label: '删除',
      disabled: layers.value.length <= 1 || !ids.length,
      command: () => ids.forEach((id) => deleteLayer(id))
    }
  ]
  void menuRef.value?.showBelowAnchorStart(event.currentTarget as HTMLElement, 4)
}
</script>

<template>
  <div class="pa-dock-panel pa-dock-panel--layers">
    <header class="pa-dock-panel__toolbar">
      <span class="pa-dock-panel__toolbar-title">{{ layers.length }} 层</span>
      <WwIconButton icon="plus" ariaLabel="新增图层" compact v-tooltip.bottom="'在当前图层上方新建'" @click="addLayer" />
    </header>

    <ul class="pa-layer-panel__list">
      <li
        v-for="(layer, displayIndex) in layers"
        :key="layer.id"
        class="pa-layer-panel__row"
        :class="{
          'pa-layer-panel__row--active': activeLayerId === layer.id,
          'pa-layer-panel__row--selected': isSelected(layer.id) && activeLayerId !== layer.id,
          'pa-layer-panel__row--drop': dropDisplayIndex === displayIndex
        }"
        draggable="true"
        @click="onRowClick(layer.id, $event)"
        @contextmenu="openLayerMenu($event, layer.id)"
        @dragstart="onDragStart(layer.id, $event)"
        @dragover="onDragOver(displayIndex, $event)"
        @drop.prevent="onDrop(displayIndex)"
        @dragend="onDragEnd"
      >
        <input
          v-if="renamingId === layer.id"
          v-model="renameValue"
          class="pa-layer-panel__rename"
          @click.stop
          @keydown.enter="commitRename(layer.id)"
          @blur="commitRename(layer.id)"
        />
        <span v-else class="pa-layer-panel__name">{{ layer.name }}</span>
        <div class="pa-layer-panel__row-actions" @click.stop>
          <WwIconButton
            :icon="layer.visible ? 'eye' : 'eye-off'"
            :ariaLabel="layer.visible ? '隐藏' : '显示'"
            compact
            @click="toggleLayerVisible(layer.id, layer.visible)"
          />
          <WwIconButton
            :icon="layer.locked ? 'pin' : 'pin-off'"
            :ariaLabel="layer.locked ? '解锁' : '锁定'"
            compact
            @click="toggleLayerLocked(layer.id, layer.locked)"
          />
          <WwIconButton
            icon="trash-2"
            ariaLabel="删除图层"
            compact
            @click="deleteLayer(layer.id)"
          />
        </div>
      </li>
    </ul>

    <WwContextMenu ref="menuRef" :model="menuItems" />
  </div>
</template>
