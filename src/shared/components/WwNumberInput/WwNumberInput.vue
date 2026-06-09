<script setup lang="ts">
/**
 * 统一数字输入（PrimeVue InputNumber 封装）
 * 样式见 ww-number-input.css
 */
import { computed, onBeforeUnmount, onMounted, ref, useAttrs } from 'vue'
import InputNumber from 'primevue/inputnumber'
import WwIcon from '@shared/components/WwIcon.vue'
import type { WwNumberInputSize } from './types'
import './ww-number-input.css'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue: number | null
    min?: number
    max?: number
    step?: number
    size?: WwNumberInputSize
    disabled?: boolean
    placeholder?: string
    minFractionDigits?: number
    maxFractionDigits?: number
    useGrouping?: boolean
    showButtons?: boolean
    wheelAdjust?: boolean
    inputId?: string
    ariaLabel?: string
  }>(),
  {
    step: 1,
    size: 'default',
    disabled: false,
    useGrouping: false,
    showButtons: true,
    wheelAdjust: true
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const attrs = useAttrs()
const rootRef = ref<HTMLElement | null>(null)
const pointerInside = ref(false)

const rootClass = computed(() => [
  attrs.class,
  'ww-number-input-root',
  `ww-number-input--${props.size}`
])

const inputClass = computed(() => ['ww-number-input', `ww-number-input--${props.size}`])

/** 仅作 Lucide 初始尺寸；实际显示由 ww-number-input.css 的 --ww-number-icon-size 控制 */
const buttonIconSize = computed((): number => {
  if (props.size === 'compact') return 11
  if (props.size === 'block') return 12
  return 14
})

const passthroughAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})

function onUpdate(value: number | null) {
  emit('update:modelValue', value)
}

function stepDecimalPlaces(step: number): number {
  if (!Number.isFinite(step)) return 0
  const normalized = Number(step.toFixed(12)).toString()
  const dot = normalized.indexOf('.')
  return dot === -1 ? 0 : normalized.length - dot - 1
}

function clampWheelValue(value: number): number {
  let next = value
  if (props.min != null) next = Math.max(props.min, next)
  if (props.max != null) next = Math.min(props.max, next)

  const places = Math.max(stepDecimalPlaces(props.step), props.maxFractionDigits ?? 0)
  if (places > 0) {
    const factor = 10 ** places
    next = Math.round(next * factor) / factor
  }
  return next
}

function wheelBaseValue(): number {
  if (props.modelValue != null && Number.isFinite(props.modelValue)) {
    return props.modelValue
  }
  if (props.min != null) return props.min
  return 0
}

function canAdjustByWheel(): boolean {
  const root = rootRef.value
  if (!root) return false
  if (pointerInside.value) return true
  const active = document.activeElement
  return active instanceof HTMLElement && root.contains(active)
}

function onWheel(event: WheelEvent) {
  if (!props.wheelAdjust || props.disabled) return
  if (!canAdjustByWheel()) return
  if (event.deltaY === 0) return

  event.preventDefault()
  event.stopPropagation()

  const direction = event.deltaY < 0 ? 1 : -1
  const next = clampWheelValue(wheelBaseValue() + direction * props.step)
  if (next === props.modelValue) return
  emit('update:modelValue', next)
}

onMounted(() => {
  rootRef.value?.addEventListener('wheel', onWheel, { passive: false })
})

onBeforeUnmount(() => {
  rootRef.value?.removeEventListener('wheel', onWheel)
})
</script>

<template>
  <div
    ref="rootRef"
    :class="rootClass"
    @mouseenter="pointerInside = true"
    @mouseleave="pointerInside = false"
  >
    <InputNumber
      :input-id="inputId"
      :model-value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      :placeholder="placeholder"
      :use-grouping="useGrouping"
      :show-buttons="showButtons"
      button-layout="stacked"
      :min-fraction-digits="minFractionDigits"
      :max-fraction-digits="maxFractionDigits"
      :allow-empty="true"
      :aria-label="ariaLabel"
      fluid
      :class="inputClass"
      v-bind="passthroughAttrs"
      @update:model-value="onUpdate"
    >
      <template #incrementbuttonicon>
        <WwIcon name="chevron-up" :size="buttonIconSize" />
      </template>
      <template #decrementbuttonicon>
        <WwIcon name="chevron-down" :size="buttonIconSize" />
      </template>
    </InputNumber>
  </div>
</template>
