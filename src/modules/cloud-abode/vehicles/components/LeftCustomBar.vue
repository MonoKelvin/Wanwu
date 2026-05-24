<script setup lang="ts">
import { computed } from 'vue'
import Slider from 'primevue/slider'

const COLOR_PRESETS = [
  '#c0c0c0',
  '#1a1a1a',
  '#8b1e2f',
  '#1e3a5f',
  '#f5f5f5',
  '#2d5016',
  '#d4af37',
  '#5c4033'
] as const

const props = defineProps<{
  bodyColor: string
  wheels: Array<{ id: string; label: string }>
  liveries: Array<{ id: string; label: string }>
  wheelId: string
  liveryId: string
}>()

const emit = defineEmits<{
  'update:bodyColor': [value: string]
  'update:wheelId': [value: string]
  'update:liveryId': [value: string]
}>()

const hue = computed({
  get() {
    return rgbToHue(props.bodyColor)
  },
  set(v: number) {
    emit('update:bodyColor', hslToHex(v, 72, 52))
  }
})

function rgbToHue(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === min) return 0
  let h = 0
  const d = max - min
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return Math.round(h * 360)
}

function hslToHex(h: number, s: number, l: number): string {
  const a = (s * Math.min(l, 100 - l)) / 100
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}
</script>

<template>
  <aside
    class="ww-showroom-panel ww-showroom-custom ww-glass-blur ww-glass-blur--dark"
    aria-label="车身定制"
  >
    <p class="ww-showroom-panel__title">定制</p>

    <section class="ww-showroom-custom__section">
      <span class="ww-showroom-custom__label">预设颜色</span>
      <div class="ww-showroom-custom__swatches" role="list">
        <button
          v-for="c in COLOR_PRESETS"
          :key="c"
          type="button"
          class="ww-showroom-custom__swatch"
          :class="{ 'ww-showroom-custom__swatch--active': bodyColor === c }"
          :style="{ backgroundColor: c }"
          :aria-label="`颜色 ${c}`"
          @click="emit('update:bodyColor', c)"
        />
      </div>
    </section>

    <section class="ww-showroom-custom__section">
      <span class="ww-showroom-custom__label">色相</span>
      <Slider v-model="hue" class="ww-showroom-hue" :min="0" :max="360" :step="1" />
      <div
        class="ww-showroom-custom__preview"
        :style="{ backgroundColor: bodyColor }"
        :title="bodyColor"
      />
    </section>

    <section v-if="wheels.length > 1" class="ww-showroom-custom__section">
      <span class="ww-showroom-custom__label">轮毂</span>
      <div class="ww-showroom-custom__options">
        <button
          v-for="w in wheels"
          :key="w.id"
          type="button"
          class="ww-showroom-custom__option"
          :class="{ 'ww-showroom-custom__option--active': wheelId === w.id }"
          @click="emit('update:wheelId', w.id)"
        >
          {{ w.label }}
        </button>
      </div>
    </section>

    <section v-if="liveries.length > 1" class="ww-showroom-custom__section">
      <span class="ww-showroom-custom__label">涂装</span>
      <div class="ww-showroom-custom__options">
        <button
          v-for="l in liveries"
          :key="l.id"
          type="button"
          class="ww-showroom-custom__option"
          :class="{ 'ww-showroom-custom__option--active': liveryId === l.id }"
          @click="emit('update:liveryId', l.id)"
        >
          {{ l.label }}
        </button>
      </div>
    </section>
  </aside>
</template>
