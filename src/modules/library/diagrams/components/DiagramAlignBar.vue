<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import WwIconButton from '@shared/components/WwIconButton.vue'
import { useDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'
import {
  DIAGRAM_ALIGN_HORIZONTAL,
  DIAGRAM_ALIGN_VERTICAL,
  DIAGRAM_DISTRIBUTE_ACTIONS
} from '@modules/library/diagrams/lib/diagramAlignActions'
import { DG_SHORTCUT } from '@modules/library/diagrams/lib/diagramKeyboardShortcuts'
import type { DiagramAlignMode, DiagramDistributeMode } from '@modules/library/diagrams/lib/diagramNodeLayout'

export type DiagramAlignBarAnchor = {
  left: number
  top: number
  width: number
  height: number
}

const props = defineProps<{
  nodeCount: number
  anchorRect?: DiagramAlignBarAnchor | null
  stageWidth?: number
  stageHeight?: number
  canGroup?: boolean
  canUngroup?: boolean
}>()

const bus = useDiagramCommandBus()
const barRef = ref<HTMLElement | null>(null)
const barWidth = ref(220)
let barObserver: ResizeObserver | null = null
let measureRaf = 0

function measureBar() {
  if (barRef.value) {
    barWidth.value = Math.max(barRef.value.offsetWidth, 160)
  }
}

onMounted(() => {
  void nextTick(measureBar)
  if (typeof ResizeObserver !== 'undefined' && barRef.value) {
    barObserver = new ResizeObserver(() => {
      if (measureRaf) cancelAnimationFrame(measureRaf)
      measureRaf = requestAnimationFrame(() => {
        measureRaf = 0
        measureBar()
      })
    })
    barObserver.observe(barRef.value)
  }
})

onUnmounted(() => {
  barObserver?.disconnect()
  barObserver = null
})

watch(
  () => [props.nodeCount, props.anchorRect],
  () => void nextTick(measureBar)
)

function align(mode: DiagramAlignMode) {
  void bus.dispatch({ type: 'canvas.alignNodes', payload: { mode } })
}

function distribute(mode: DiagramDistributeMode) {
  void bus.dispatch({ type: 'canvas.distributeNodes', payload: { mode } })
}

function group() {
  void bus.dispatch({ type: 'canvas.group' })
}

function ungroup() {
  void bus.dispatch({ type: 'canvas.ungroup' })
}

const barStyle = computed(() => {
  const rect = props.anchorRect
  if (!rect) return undefined

  const stageW = props.stageWidth ?? 800
  const stageH = props.stageHeight ?? 600
  const barHalf = barWidth.value / 2
  const gap = 10
  const toolbarReserve = 52
  const footerReserve = 56
  const barH = 36

  const centerX = Math.min(
    stageW - barHalf - 12,
    Math.max(barHalf + 12, rect.left + rect.width / 2)
  )

  const spaceAbove = rect.top - toolbarReserve
  const spaceBelow = stageH - footerReserve - (rect.top + rect.height)
  const placeBelow = spaceAbove < barH + gap && spaceBelow > spaceAbove

  if (placeBelow) {
    const top = Math.min(rect.top + rect.height + gap, stageH - footerReserve - barH)
    return {
      left: `${centerX}px`,
      top: `${top}px`,
      transform: 'translate(-50%, 0)',
      right: 'auto'
    }
  }

  const top = Math.max(toolbarReserve, rect.top - gap)
  return {
    left: `${centerX}px`,
    top: `${top}px`,
    transform: 'translate(-50%, -100%)',
    right: 'auto'
  }
})
</script>

<template>
  <div
    v-if="anchorRect"
    ref="barRef"
    class="dg-align-bar dg-align-bar--anchored dg-float ww-glass-blur"
    :style="barStyle"
    role="toolbar"
    aria-label="对齐与分布"
  >
    <span class="dg-align-bar__badge">{{ nodeCount }}</span>

    <div class="dg-align-bar__actions">
      <WwIconButton
        v-for="action in DIAGRAM_ALIGN_HORIZONTAL"
        :key="action.mode"
        :icon="action.icon"
        icon-size="xs"
        compact
        :aria-label="action.label"
        v-tooltip.bottom="action.label"
        class="dg-align-bar__btn dg-toolbar-icon-btn"
        @click="align(action.mode)"
      />
    </div>

    <span class="dg-align-bar__sep" aria-hidden="true" />

    <div class="dg-align-bar__actions">
      <WwIconButton
        v-for="action in DIAGRAM_ALIGN_VERTICAL"
        :key="action.mode"
        :icon="action.icon"
        icon-size="xs"
        compact
        :aria-label="action.label"
        v-tooltip.bottom="action.label"
        class="dg-align-bar__btn dg-toolbar-icon-btn"
        @click="align(action.mode)"
      />
    </div>

    <template v-if="nodeCount >= 3">
      <span class="dg-align-bar__sep" aria-hidden="true" />
      <div class="dg-align-bar__actions">
        <WwIconButton
          v-for="action in DIAGRAM_DISTRIBUTE_ACTIONS"
          :key="action.mode"
          :icon="action.icon"
          icon-size="xs"
          compact
          :aria-label="action.label"
          v-tooltip.bottom="action.label"
          class="dg-align-bar__btn dg-toolbar-icon-btn"
          @click="distribute(action.mode)"
        />
      </div>
    </template>

    <span class="dg-align-bar__sep" aria-hidden="true" />
    <div class="dg-align-bar__actions">
      <WwIconButton
        icon="layers"
        icon-size="xs"
        compact
        aria-label="组合"
        :disabled="!canGroup"
        v-tooltip.bottom="`组合 (${DG_SHORTCUT.group})`"
        class="dg-align-bar__btn dg-toolbar-icon-btn"
        @mousedown.prevent
        @click="group"
      />
      <WwIconButton
        icon="ungroup"
        icon-size="xs"
        compact
        aria-label="取消组合"
        :disabled="!canUngroup"
        v-tooltip.bottom="`取消组合 (${DG_SHORTCUT.ungroup})`"
        class="dg-align-bar__btn dg-toolbar-icon-btn"
        @mousedown.prevent
        @click="ungroup"
      />
    </div>
  </div>
</template>
