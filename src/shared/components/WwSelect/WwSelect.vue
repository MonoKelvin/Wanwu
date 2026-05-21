<script setup lang="ts">
/**
 * 统一下拉（PrimeVue Select 封装）
 * 样式见 ww-select.css；宽度见 selectWidth.ts；高度 selectOverlayHeight.ts
 */
import { computed, onBeforeUnmount, onMounted, ref, useAttrs, watch } from 'vue'
import Select from 'primevue/select'
import {
  buildPanelOverlayStyle,
  minWidthRemForSelectTrigger
} from './selectWidth'
import {
  scrollHeightForSelectOptions,
  selectListNeedsScroll
} from './selectOverlayHeight'
import type { WwSelectSize } from './types'
import './ww-select.css'

const SIZE_WIDTH_EXTRA: Record<Exclude<WwSelectSize, 'block'>, number> = {
  default: 0.75,
  narrow: 0.5
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue: unknown
    options: unknown[]
    optionLabel?: string
    optionValue?: string
    placeholder?: string
    size?: WwSelectSize
    disabled?: boolean
    /** 非 block 时：触发器 min-width 按最长选项估算 */
    fitOptions?: boolean
    overlayOpacity?: number
    minWidth?: string
  }>(),
  {
    optionLabel: 'label',
    optionValue: 'value',
    size: 'default',
    fitOptions: false,
    overlayOpacity: 0.42
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: unknown]
}>()

const attrs = useAttrs()
const rootRef = ref<HTMLElement | null>(null)
const triggerWidthPx = ref(0)
const panelOverlayStyle = ref<Record<string, string>>({})
const panelNeedsEllipsis = ref(false)

let resizeObserver: ResizeObserver | null = null

const scrollHeight = computed(() => scrollHeightForSelectOptions(props.options.length))

const selectPt = computed(() => ({
  transition: { name: 'ww-select-panel', appear: true },
  listContainer: {
    class: selectListNeedsScroll(props.options.length) ? 'ww-select-list--scrollable' : ''
  }
}))

const overlayGlassVars = computed(() => ({
  '--ww-select-overlay-bg': `color-mix(in srgb, var(--ww-glass-bg-soft) ${Math.round(props.overlayOpacity * 100)}%, transparent)`,
  '--ww-select-overlay-blur': '40px'
}))

const triggerCssVars = computed(() => {
  const vars: Record<string, string> = { ...overlayGlassVars.value }

  if (props.size === 'block') {
    vars['--ww-select-min-w'] = '100%'
    return vars
  }

  if (props.fitOptions) {
    const extra = SIZE_WIDTH_EXTRA[props.size]
    vars['--ww-select-min-w'] = minWidthRemForSelectTrigger(
      props.options,
      props.optionLabel,
      extra
    )
  } else if (props.minWidth) {
    vars['--ww-select-min-w'] = props.minWidth
  }

  if (triggerWidthPx.value > 0) {
    vars['--ww-select-panel-w'] = panelOverlayStyle.value['--ww-select-panel-w'] ?? `${triggerWidthPx.value}px`
    vars['--ww-select-panel-max-w'] =
      panelOverlayStyle.value['--ww-select-panel-max-w'] ?? `${triggerWidthPx.value}px`
  }

  return vars
})

const mergedOverlayStyle = computed(() => ({
  ...overlayGlassVars.value,
  ...panelOverlayStyle.value
}))

const rootClass = computed(() => [
  attrs.class,
  'ww-select',
  `ww-select--${props.size}`
])

function getTriggerEl(): HTMLElement | null {
  return rootRef.value?.querySelector('.p-select') as HTMLElement | null
}

function measureTriggerWidth(): number {
  const trigger = getTriggerEl()
  if (!trigger) return 0
  return Math.ceil(trigger.getBoundingClientRect().width)
}

/** 在 overlay 挂载前同步写入宽度，避免先 auto 再跳变 */
function syncPanelWidth(): void {
  const trigger = getTriggerEl()
  if (!trigger) return

  const width = measureTriggerWidth()
  triggerWidthPx.value = width

  const { style, needsEllipsis } = buildPanelOverlayStyle({
    triggerWidthPx: width,
    options: props.options,
    optionLabel: props.optionLabel,
    anchorEl: trigger
  })
  panelOverlayStyle.value = style
  panelNeedsEllipsis.value = needsEllipsis
}

function onPanelBeforeShow() {
  syncPanelWidth()
}

function onPanelHide() {
  panelNeedsEllipsis.value = false
}

function labelOf(option: unknown): string {
  return option !== null && typeof option === 'object' && props.optionLabel in (option as object)
    ? String((option as Record<string, unknown>)[props.optionLabel])
    : String(option)
}

function attachResizeObserver() {
  resizeObserver?.disconnect()
  const trigger = getTriggerEl()
  if (!trigger) return
  resizeObserver = new ResizeObserver(() => {
    const w = measureTriggerWidth()
    if (w > 0) triggerWidthPx.value = w
  })
  resizeObserver.observe(trigger)
}

onMounted(() => {
  syncPanelWidth()
  attachResizeObserver()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

watch(
  () => [props.options, props.optionLabel, props.size],
  () => syncPanelWidth(),
  { deep: true }
)
</script>

<template>
  <div ref="rootRef" class="ww-select-root" :style="triggerCssVars" @pointerdown.capture="syncPanelWidth">
    <Select
      v-bind="attrs"
      :model-value="modelValue"
      :options="options"
      :option-label="optionLabel"
      :option-value="optionValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :scroll-height="scrollHeight"
      append-to="body"
      :style="triggerCssVars"
      :overlay-style="mergedOverlayStyle"
      :class="rootClass"
      panel-class="ww-select-overlay"
      :pt="selectPt"
      @before-show="onPanelBeforeShow"
      @hide="onPanelHide"
      @update:model-value="emit('update:modelValue', $event)"
    >
      <template #option="slotProps">
        <span
          class="ww-select-option-label"
          :title="panelNeedsEllipsis ? labelOf(slotProps.option) : undefined"
        >
          {{ labelOf(slotProps.option) }}
        </span>
      </template>
    </Select>
  </div>
</template>

<style scoped>
.ww-select-root {
  display: contents;
}

.ww-select-root:has(.ww-select--block) {
  display: block;
  width: 100%;
  min-width: 0;
}
</style>
