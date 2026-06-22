<script setup lang="ts">
defineOptions({ name: 'PixelLayerPanel' })

import { computed, ref } from 'vue'
import WwButton from '@shared/components/WwButton.vue'
import WwIconButton from '@shared/components/WwIconButton.vue'
import type { PixelDocument } from '@modules/library/pixel-art/domain/types'
import type { PixelCanvasEngine } from '@modules/library/pixel-art/services/PixelCanvasEngine'
import { getActiveFrame } from '@modules/library/pixel-art/lib/blankDocument'
import { PixelCmd } from '@modules/library/pixel-art/app/command/domain/ids'
import type { IPixelCommandBus } from '@modules/library/pixel-art/app/command/PixelCommandRegistry'

const props = defineProps<{
  document: PixelDocument | null
  engine: PixelCanvasEngine | null
  bus?: IPixelCommandBus | null
}>()

const emit = defineEmits<{ change: [] }>()

const renamingId = ref<string | null>(null)
const renameValue = ref('')

const layers = computed(() => {
  if (!props.document) return []
  return getActiveFrame(props.document).layers.slice().reverse()
})

function dispatch(type: string, payload?: Record<string, unknown>) {
  if (props.bus) void props.bus.dispatch({ type, payload })
}

function setActive(id: string) {
  if (props.bus) {
    dispatch(PixelCmd.Layer.SetActive, { layerId: id })
  } else {
    props.engine?.setActiveLayer(id)
    if (props.document) props.document.meta.activeLayerId = id
  }
  emit('change')
}

function toggleVisible(layerId: string, visible: boolean) {
  if (props.bus) {
    dispatch(PixelCmd.Layer.SetVisible, { layerId, visible: !visible })
  } else {
    props.engine?.setLayerVisible(layerId, !visible)
  }
  emit('change')
}

function toggleLocked(layerId: string, locked: boolean) {
  if (props.bus) {
    dispatch(PixelCmd.Layer.SetLocked, { layerId, locked: !locked })
  } else {
    props.engine?.setLayerLocked(layerId, !locked)
  }
  emit('change')
}

function addLayer() {
  try {
    if (props.bus) dispatch(PixelCmd.Layer.Add)
    else props.engine?.addLayer()
    emit('change')
  } catch {
    /* max layers */
  }
}

function deleteLayer(layerId: string) {
  if (props.bus) dispatch(PixelCmd.Layer.Delete, { layerId })
  else props.engine?.deleteLayer(layerId)
  emit('change')
}

function mergeVisible() {
  if (props.bus) dispatch(PixelCmd.Layer.MergeVisible)
  else props.engine?.mergeVisibleLayers()
  emit('change')
}

function startRename(layerId: string, name: string) {
  renamingId.value = layerId
  renameValue.value = name
}

function commitRename(layerId: string) {
  const name = renameValue.value.trim()
  if (name && props.bus) dispatch(PixelCmd.Layer.Rename, { layerId, name })
  else if (name) props.engine?.renameLayer(layerId, name)
  renamingId.value = null
  emit('change')
}
</script>

<template>
  <div class="pixel-layer-panel">
    <div class="header">
      <span>图层</span>
      <div class="header-actions">
        <WwButton size="sm" variant="ghost" @click="mergeVisible">合并可见</WwButton>
        <WwIconButton icon="plus" ariaLabel="新增图层" @click="addLayer" />
      </div>
    </div>
    <ul class="layer-list">
      <li
        v-for="layer in layers"
        :key="layer.id"
        :class="{ active: document?.meta.activeLayerId === layer.id }"
        @click="setActive(layer.id)"
      >
        <input
          v-if="renamingId === layer.id"
          v-model="renameValue"
          class="rename-input"
          @click.stop
          @keydown.enter="commitRename(layer.id)"
          @blur="commitRename(layer.id)"
        />
        <span v-else class="name" @dblclick.stop="startRename(layer.id, layer.name)">{{ layer.name }}</span>
        <div class="actions" @click.stop>
          <WwIconButton
            :icon="layer.visible ? 'eye' : 'eye-off'"
            :ariaLabel="layer.visible ? '隐藏' : '显示'"
            @click="toggleVisible(layer.id, layer.visible)"
          />
          <WwIconButton
            :icon="layer.locked ? 'pin' : 'pin-off'"
            :ariaLabel="layer.locked ? '解锁' : '锁定'"
            @click="toggleLocked(layer.id, layer.locked)"
          />
          <WwIconButton icon="trash-2" ariaLabel="删除" @click="deleteLayer(layer.id)" />
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.pixel-layer-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.layer-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.layer-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  background: var(--ww-inset);
}

.layer-list li.active {
  background: var(--ww-accent-subtle);
}

.name {
  font-size: 12px;
}

.rename-input {
  flex: 1;
  font-size: 12px;
  padding: 2px 4px;
  border: 1px solid var(--ww-border);
  border-radius: 4px;
  background: var(--ww-surface);
}

.actions {
  display: flex;
  gap: 2px;
}
</style>
