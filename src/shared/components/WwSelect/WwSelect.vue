<script setup lang="ts">
/**
 * 统一下拉（PrimeVue Select 封装）
 * 样式见 ww-select.css；宽度 selectMinWidth.ts；高度 selectOverlayHeight.ts
 */
import { computed, useAttrs } from 'vue'
import Select from 'primevue/select'
import { minWidthForSelectOptions } from './selectMinWidth'
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
    fitOptions?: boolean
    overlayOpacity?: number
    minWidth?: string
  }>(),
  {
    optionLabel: 'label',
    optionValue: 'value',
    size: 'default',
    fitOptions: true,
    overlayOpacity: 0.42
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: unknown]
}>()

const attrs = useAttrs()

const scrollHeight = computed(() => scrollHeightForSelectOptions(props.options.length))

const selectPt = computed(() => ({
  transition: { name: 'ww-select-panel', appear: true },
  listContainer: {
    class: selectListNeedsScroll(props.options.length) ? 'ww-select-list--scrollable' : ''
  }
}))

const cssVars = computed(() => {
  const vars: Record<string, string> = {
    '--ww-select-overlay-bg': `color-mix(in srgb, var(--ww-glass-bg-soft) ${Math.round(props.overlayOpacity * 100)}%, transparent)`,
    '--ww-select-overlay-blur': '40px'
  }

  if (props.size === 'block') {
    vars['--ww-select-min-w'] = '100%'
    return vars
  }

  if (props.fitOptions) {
    const extra = SIZE_WIDTH_EXTRA[props.size]
    vars['--ww-select-min-w'] = minWidthForSelectOptions(
      props.options,
      props.optionLabel,
      extra
    )
  } else if (props.minWidth) {
    vars['--ww-select-min-w'] = props.minWidth
  }

  return vars
})

const rootClass = computed(() => [
  attrs.class,
  'ww-select',
  `ww-select--${props.size}`
])
</script>

<template>
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
    :style="cssVars"
    :overlay-style="cssVars"
    :class="rootClass"
    panel-class="ww-select-overlay"
    :pt="selectPt"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
