<script setup lang="ts">
/**
 * 统一下拉（PrimeVue Select 封装）
 * 样式见同目录 ww-select.css；宽度逻辑见 selectMinWidth.ts
 */
import { computed, useAttrs } from 'vue'
import Select from 'primevue/select'
import { minWidthForSelectOptions } from './selectMinWidth'
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
    /** 按最长选项自动计算最小宽度 */
    fitOptions?: boolean
    /** 下拉面板背景不透明度 0–1 */
    overlayOpacity?: number
    /** 覆盖最小宽度（fitOptions 为 false 时生效） */
    minWidth?: string
  }>(),
  {
    optionLabel: 'label',
    optionValue: 'value',
    size: 'default',
    fitOptions: true,
    overlayOpacity: 0.55
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: unknown]
}>()

const attrs = useAttrs()

const cssVars = computed(() => {
  const vars: Record<string, string> = {
    '--ww-select-overlay-bg': `rgb(255 255 255 / ${props.overlayOpacity})`
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
    append-to="body"
    :style="cssVars"
    :overlay-style="cssVars"
    :class="rootClass"
    panel-class="ww-select-overlay"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
