<script setup lang="ts">
/**
 * 统一滑块（PrimeVue Slider 封装）
 * 圆形拇指 + 过渡动画
 */
import { computed, useAttrs } from 'vue'
import Slider from 'primevue/slider'

defineOptions({ inheritAttrs: false })

const model = defineModel<number | number[]>()

withDefaults(
  defineProps<{
    min?: number
    max?: number
    step?: number
    disabled?: boolean
  }>(),
  {
    min: 0,
    max: 100,
    step: 1,
    disabled: false
  }
)

defineEmits<{
  slideend: [event: Event]
  change: [event: Event]
}>()

const attrs = useAttrs()

const rootClass = computed(() => ['ww-slider', attrs.class])
const passthroughAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})
</script>

<template>
  <Slider
    v-bind="passthroughAttrs"
    v-model="model"
    :class="rootClass"
    :min="min"
    :max="max"
    :step="step"
    :disabled="disabled"
    @slideend="$emit('slideend', $event)"
    @change="$emit('change', $event)"
  />
</template>

<style>
.ww-slider.p-slider {
  height: 0.375rem;
  border-radius: 999px;
  background: var(--ww-inset) !important;
}

.ww-slider.p-slider .p-slider-range {
  border-radius: 999px;
  background: var(--ww-ink) !important;
  transition: width 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}

.ww-slider.p-slider .p-slider-handle {
  width: 0.875rem;
  height: 0.875rem;
  aspect-ratio: 1;
  margin: 0 !important;
  top: 50% !important;
  border-radius: 50% !important;
  border: 2px solid var(--ww-elevated) !important;
  background: var(--ww-ink) !important;
  box-shadow: var(--ww-shadow-soft) !important;
  transform: translate(-50%, -50%);
  transition:
    left 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.18s var(--ww-ease-out),
    box-shadow 0.18s var(--ww-ease-out);
}

.ww-slider.p-slider .p-slider-handle:hover {
  transform: translate(-50%, -50%) scale(1.1);
  box-shadow: 0 2px 10px color-mix(in srgb, var(--ww-ink) 22%, transparent) !important;
}

.ww-slider.p-slider .p-slider-handle:active {
  transform: translate(-50%, -50%) scale(1.04);
  transition-duration: 0.08s;
}

.ww-slider.p-slider[data-p-sliding='true'] .p-slider-handle {
  transform: translate(-50%, -50%) scale(1.08);
  box-shadow: 0 3px 12px color-mix(in srgb, var(--ww-ink) 28%, transparent) !important;
  transition:
    left 0.08s linear,
    transform 0.12s var(--ww-ease-out),
    box-shadow 0.12s var(--ww-ease-out);
}

[data-theme='dark'] .ww-slider.p-slider .p-slider-handle {
  border-color: color-mix(in srgb, var(--ww-elevated) 80%, rgb(255 255 255 / 0.35)) !important;
}
</style>
