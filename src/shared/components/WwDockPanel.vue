<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'
import type { WwIconName } from '@shared/icons/registry'

export interface WwDockPanelItem {
  id: string
  title: string
  icon?: WwIconName
  defaultExpanded?: boolean
}

export interface WwDockStack {
  id: string
  type: 'tabs' | 'pane'
  panelIds: string[]
  activeTabId?: string
  /** 高度权重，用于垂直分配 */
  weight: number
}

const props = defineProps<{
  panels: WwDockPanelItem[]
  storageKey?: string
  defaultStacks?: WwDockStack[]
  minStackWeight?: number
}>()

const panelMap = computed(() => new Map(props.panels.map((p) => [p.id, p])))

const defaultLayout = (): WwDockStack[] =>
  props.defaultStacks ?? [
    {
      id: 'main-tabs',
      type: 'tabs',
      panelIds: ['props', 'palette', 'doc'],
      activeTabId: 'props',
      weight: 1.15
    },
    { id: 'layers-pane', type: 'pane', panelIds: ['layers'], weight: 1 }
  ]

const stacks = ref<WwDockStack[]>(defaultLayout())
const rootRef = ref<HTMLElement | null>(null)
const dragTab = ref<{ stackId: string; panelId: string } | null>(null)
const dropTabTarget = ref<{ stackId: string; index: number } | null>(null)

let resizeIndex = -1
let resizeStartY = 0
let resizeStartWeights: number[] = []

function normalizeStacks(raw: WwDockStack[]): WwDockStack[] {
  const ids = props.panels.map((p) => p.id)
  const validStacks = raw
    .map((s) => ({
      ...s,
      panelIds: s.panelIds.filter((id) => ids.includes(id)),
      activeTabId: s.activeTabId && ids.includes(s.activeTabId) ? s.activeTabId : undefined,
      weight: Math.max(props.minStackWeight ?? 0.35, s.weight || 1)
    }))
    .filter((s) => s.panelIds.length > 0)

  const assigned = new Set(validStacks.flatMap((s) => s.panelIds))
  const missing = ids.filter((id) => !assigned.has(id))
  if (!validStacks.length) return defaultLayout()
  if (missing.length && validStacks[0]?.type === 'tabs') {
    validStacks[0].panelIds.push(...missing)
    if (!validStacks[0].activeTabId) validStacks[0].activeTabId = missing[0]
  }
  return validStacks
}

function loadLayout(): WwDockStack[] {
  if (!props.storageKey) return normalizeStacks(defaultLayout())
  try {
    const raw = localStorage.getItem(`${props.storageKey}.layout`)
    if (!raw) return normalizeStacks(defaultLayout())
    return normalizeStacks(JSON.parse(raw) as WwDockStack[])
  } catch {
    return normalizeStacks(defaultLayout())
  }
}

function saveLayout() {
  if (!props.storageKey) return
  localStorage.setItem(`${props.storageKey}.layout`, JSON.stringify(stacks.value))
}

onMounted(() => {
  stacks.value = loadLayout()
})

function stackStyle(stack: WwDockStack) {
  return { flex: `${stack.weight} 1 0`, minHeight: `${(props.minStackWeight ?? 0.35) * 5}rem` }
}

function setActiveTab(stackId: string, panelId: string) {
  const stack = stacks.value.find((s) => s.id === stackId)
  if (!stack || stack.type !== 'tabs') return
  stack.activeTabId = panelId
  saveLayout()
}

function activePanelId(stack: WwDockStack): string {
  if (stack.type === 'tabs') {
    const active = stack.activeTabId ?? stack.panelIds[0]
    return stack.panelIds.includes(active!) ? active! : stack.panelIds[0]!
  }
  return stack.panelIds[0]!
}

function onTabDragStart(stackId: string, panelId: string, e: DragEvent) {
  dragTab.value = { stackId, panelId }
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', panelId)
  }
}

function onTabDragOver(stackId: string, index: number, e: DragEvent) {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  dropTabTarget.value = { stackId, index }
}

function onTabDrop(stackId: string, index: number) {
  const drag = dragTab.value
  dragTab.value = null
  dropTabTarget.value = null
  if (!drag) return

  const sourceStack = stacks.value.find((s) => s.id === drag.stackId)
  const targetStack = stacks.value.find((s) => s.id === stackId)
  if (!sourceStack || !targetStack || targetStack.type !== 'tabs') return

  const movingId = drag.panelId
  sourceStack.panelIds = sourceStack.panelIds.filter((id) => id !== movingId)
  if (sourceStack.activeTabId === movingId) {
    sourceStack.activeTabId = sourceStack.panelIds[0]
  }

  const targetIds = targetStack.panelIds.filter((id) => id !== movingId)
  targetIds.splice(index, 0, movingId)
  targetStack.panelIds = targetIds
  targetStack.activeTabId = movingId

  stacks.value = stacks.value.filter((s) => s.panelIds.length > 0)
  if (!stacks.value.some((s) => s.type === 'tabs')) {
    stacks.value.unshift(defaultLayout()[0]!)
  }
  saveLayout()
}

function onTabDragEnd() {
  dragTab.value = null
  dropTabTarget.value = null
}

function startStackResize(index: number, e: PointerEvent) {
  if (index >= stacks.value.length - 1) return
  resizeIndex = index
  resizeStartY = e.clientY
  resizeStartWeights = stacks.value.map((s) => s.weight)
  document.addEventListener('pointermove', onStackResizeMove)
  document.addEventListener('pointerup', endStackResize)
  document.addEventListener('pointercancel', endStackResize)
  e.preventDefault()
}

function onStackResizeMove(e: PointerEvent) {
  if (resizeIndex < 0 || !rootRef.value) return
  const totalWeight = resizeStartWeights.reduce((a, b) => a + b, 0)
  const rect = rootRef.value.getBoundingClientRect()
  const deltaRatio = (e.clientY - resizeStartY) / Math.max(rect.height, 1)
  const minW = props.minStackWeight ?? 0.35
  const a0 = resizeStartWeights[resizeIndex]!
  const b0 = resizeStartWeights[resizeIndex + 1]!
  let nextA = a0 + deltaRatio * totalWeight
  let nextB = b0 - deltaRatio * totalWeight
  if (nextA < minW) {
    nextB -= minW - nextA
    nextA = minW
  }
  if (nextB < minW) {
    nextA -= minW - nextB
    nextB = minW
  }
  stacks.value[resizeIndex]!.weight = Math.max(minW, nextA)
  stacks.value[resizeIndex + 1]!.weight = Math.max(minW, nextB)
}

function endStackResize() {
  if (resizeIndex >= 0) saveLayout()
  resizeIndex = -1
  document.removeEventListener('pointermove', onStackResizeMove)
  document.removeEventListener('pointerup', endStackResize)
  document.removeEventListener('pointercancel', endStackResize)
}

onBeforeUnmount(endStackResize)
</script>

<template>
  <div ref="rootRef" class="ww-dock">
    <template v-for="(stack, stackIndex) in stacks" :key="stack.id">
      <section class="ww-dock-stack" :style="stackStyle(stack)">
        <header v-if="stack.type === 'tabs'" class="ww-dock-tabs" role="tablist">
          <div
            v-for="(panelId, tabIndex) in stack.panelIds"
            :key="panelId"
            class="ww-dock-tabs__slot"
            :class="{
              'ww-dock-tabs__slot--drop': dropTabTarget?.stackId === stack.id && dropTabTarget.index === tabIndex
            }"
            @dragover="onTabDragOver(stack.id, tabIndex, $event)"
            @drop.prevent="onTabDrop(stack.id, tabIndex)"
          >
            <button
              v-if="panelMap.get(panelId)"
              type="button"
              role="tab"
              class="ww-dock-tab"
              draggable="true"
              :class="{ 'ww-dock-tab--active': activePanelId(stack) === panelId }"
              :aria-selected="activePanelId(stack) === panelId"
              @click="setActiveTab(stack.id, panelId)"
              @dragstart="onTabDragStart(stack.id, panelId, $event)"
              @dragend="onTabDragEnd"
            >
              <WwIcon v-if="panelMap.get(panelId)?.icon" :name="panelMap.get(panelId)!.icon!" size="xs" />
              <span class="ww-dock-tab__label">{{ panelMap.get(panelId)!.title }}</span>
            </button>
          </div>
        </header>

        <header v-else class="ww-dock-pane-head">
          <WwIcon v-if="panelMap.get(stack.panelIds[0]!)?.icon" :name="panelMap.get(stack.panelIds[0]!)!.icon!" size="sm" />
          <span class="ww-dock-pane-head__title">{{ panelMap.get(stack.panelIds[0]!)?.title }}</span>
        </header>

        <div class="ww-dock-stack__body">
          <slot :name="activePanelId(stack)" />
        </div>
      </section>

      <div
        v-if="stackIndex < stacks.length - 1"
        class="ww-dock-splitter"
        role="separator"
        aria-orientation="horizontal"
        aria-label="调整面板高度"
        @pointerdown="startStackResize(stackIndex, $event)"
      />
    </template>
  </div>
</template>

<style scoped>
.ww-dock {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.ww-dock-stack {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.ww-dock-tabs {
  display: flex;
  flex-shrink: 0;
  gap: 0.125rem;
  padding: 0.25rem 0.375rem 0;
  border-bottom: 1px solid var(--ww-border-subtle);
  background: color-mix(in srgb, var(--ww-surface) 90%, transparent);
}

.ww-dock-tabs__slot {
  min-width: 0;
  border-radius: 0.3125rem 0.3125rem 0 0;
}

.ww-dock-tabs__slot--drop {
  background: color-mix(in srgb, var(--ww-accent) 14%, transparent);
}

.ww-dock-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  max-width: 6.5rem;
  padding: 0.3125rem 0.4375rem;
  border: none;
  border-radius: 0.3125rem 0.3125rem 0 0;
  background: transparent;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--ww-ink-muted);
  cursor: grab;
  user-select: none;
}

.ww-dock-tab--active {
  color: var(--ww-ink);
  background: var(--ww-content);
  box-shadow: inset 0 1px 0 var(--ww-border-subtle);
}

.ww-dock-tab__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ww-dock-pane-head {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
  padding: 0.375rem 0.5rem;
  border-bottom: 1px solid var(--ww-border-subtle);
  background: color-mix(in srgb, var(--ww-surface) 90%, transparent);
}

.ww-dock-pane-head__title {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--ww-ink);
}

.ww-dock-stack__body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.ww-dock-splitter {
  flex-shrink: 0;
  height: 0.3125rem;
  margin: -0.0625rem 0;
  cursor: row-resize;
  background: transparent;
  position: relative;
  z-index: 1;
}

.ww-dock-splitter::after {
  content: '';
  position: absolute;
  left: 0.75rem;
  right: 0.75rem;
  top: 50%;
  height: 1px;
  transform: translateY(-50%);
  background: var(--ww-border-subtle);
  transition: background 0.12s ease;
}

.ww-dock-splitter:hover::after,
.ww-dock-splitter:active::after {
  background: color-mix(in srgb, var(--ww-accent) 55%, var(--ww-border-subtle));
}
</style>
