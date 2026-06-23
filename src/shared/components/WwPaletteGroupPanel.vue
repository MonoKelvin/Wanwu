<script setup lang="ts">
import { ref } from 'vue'
import WwContextMenu from '@shared/components/WwContextMenu.vue'
import type { WwMenuItem } from '@shared/types/menu'
import type { ColorPaletteGroup } from '@shared/lib/globalColorPalettes'
import { colorPreviewCss } from '@shared/lib/colorWithAlpha'

const props = defineProps<{
  groups: ColorPaletteGroup[]
  /** 当前取色，用于右键分组标题快速添加 */
  addColor?: string
}>()

const emit = defineEmits<{
  pick: [color: string]
  'add-to-group': [groupId: string, color: string]
}>()

const expanded = ref<Record<string, boolean>>({})
const dropTarget = ref<string | null>(null)
const menuRef = ref<InstanceType<typeof WwContextMenu> | null>(null)
const menuItems = ref<WwMenuItem[]>([])
let contextColor = ''

function isExpanded(id: string): boolean {
  return expanded.value[id] !== false
}

function toggle(id: string) {
  expanded.value[id] = !isExpanded(id)
}

function openSwatchMenu(event: MouseEvent, color: string) {
  event.preventDefault()
  contextColor = color
  menuItems.value = props.groups.map((g) => ({
    label: `添加到「${g.name}」`,
    command: () => emit('add-to-group', g.id, contextColor)
  }))
  void menuRef.value?.showBelowAnchorStart(event.currentTarget as HTMLElement, 4)
}

function onHeadContextMenu(event: MouseEvent, groupId: string) {
  if (!props.addColor?.trim()) return
  event.preventDefault()
  emit('add-to-group', groupId, props.addColor)
}

function onDragStart(event: DragEvent, color: string) {
  event.dataTransfer?.setData('text/plain', color)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'
}

function onDragOver(event: DragEvent, groupId: string) {
  event.preventDefault()
  dropTarget.value = groupId
}

function onDragLeave(groupId: string) {
  if (dropTarget.value === groupId) dropTarget.value = null
}

function onDrop(event: DragEvent, groupId: string) {
  event.preventDefault()
  dropTarget.value = null
  const color = event.dataTransfer?.getData('text/plain')?.trim()
  if (color) emit('add-to-group', groupId, color)
}
</script>

<template>
  <div class="ww-palette-groups">
    <section v-for="group in groups" :key="group.id" class="ww-palette-groups__section">
      <button
        type="button"
        class="ww-palette-groups__head"
        @click="toggle(group.id)"
        @contextmenu="onHeadContextMenu($event, group.id)"
      >
        <span class="ww-palette-groups__chevron" :class="{ 'is-open': isExpanded(group.id) }">›</span>
        <span class="ww-palette-groups__name">{{ group.name }}</span>
        <span class="ww-palette-groups__count">{{ group.colors.length }}</span>
      </button>
      <div
        v-show="isExpanded(group.id)"
        class="ww-palette-groups__body"
        :class="{ 'ww-palette-groups__body--drop': dropTarget === group.id }"
        @dragover="onDragOver($event, group.id)"
        @dragleave="onDragLeave(group.id)"
        @drop="onDrop($event, group.id)"
      >
        <button
          v-for="(color, i) in group.colors"
          :key="`${group.id}-${i}`"
          type="button"
          class="ww-palette-groups__swatch"
          draggable="true"
          :style="{ backgroundColor: colorPreviewCss(color) }"
          :title="`${color}（拖拽或右键可添加到其他色板）`"
          @click="emit('pick', color)"
          @contextmenu="openSwatchMenu($event, color)"
          @dragstart="onDragStart($event, color)"
        />
      </div>
    </section>
    <WwContextMenu ref="menuRef" :model="menuItems" />
  </div>
</template>

<style scoped>
.ww-palette-groups {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.ww-palette-groups__section {
  border: 1px solid var(--ww-border-subtle);
  border-radius: 0.5rem;
  overflow: hidden;
}

.ww-palette-groups__head {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  width: 100%;
  padding: 0.4375rem 0.5rem;
  border: none;
  background: transparent;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ww-ink);
  cursor: pointer;
}

.ww-palette-groups__chevron {
  width: 0.875rem;
  color: var(--ww-ink-muted);
  transform: rotate(0deg);
  transition: transform 0.16s ease;
}

.ww-palette-groups__chevron.is-open {
  transform: rotate(90deg);
}

.ww-palette-groups__name {
  flex: 1;
  text-align: left;
}

.ww-palette-groups__count {
  font-size: 0.625rem;
  color: var(--ww-ink-faint);
}

.ww-palette-groups__body {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3125rem;
  padding: 0 0.5rem 0.5rem;
  min-height: 1.75rem;
  border-radius: 0 0 0.4375rem 0.4375rem;
  transition: background 0.12s ease;
}

.ww-palette-groups__body--drop {
  background: color-mix(in srgb, var(--ww-accent) 12%, transparent);
}

.ww-palette-groups__swatch {
  width: 1.375rem;
  height: 1.375rem;
  padding: 0;
  border: 1px solid var(--ww-border-subtle);
  border-radius: 0.3125rem;
  cursor: pointer;
}
</style>
