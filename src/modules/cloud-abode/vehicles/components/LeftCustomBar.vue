<script setup lang="ts">
import { computed } from 'vue'

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
    const c = new Option().style
    c.color = props.bodyColor
    return c.color ? rgbToHue(props.bodyColor) : 0
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
    class="pointer-events-auto flex w-14 flex-col items-center gap-4 rounded-2xl border border-white/10 bg-black/45 px-2 py-4 backdrop-blur-md"
    aria-label="车身定制"
  >
    <label class="flex w-full flex-col items-center gap-1 text-[10px] text-white/55">
      Hue
      <input
        v-model.number="hue"
        type="range"
        min="0"
        max="360"
        class="h-24 w-2 appearance-none rounded-full bg-gradient-to-b from-red-500 via-green-400 to-blue-500 [writing-mode:vertical-lr]"
      />
    </label>
    <div
      class="h-10 w-10 rounded-full border-2 border-white/30 shadow-inner"
      :style="{ backgroundColor: bodyColor }"
      :title="bodyColor"
    />
    <div v-if="wheels.length > 1" class="flex w-full flex-col gap-1">
      <span class="text-center text-[10px] text-white/45">轮毂</span>
      <button
        v-for="w in wheels"
        :key="w.id"
        type="button"
        class="rounded px-1 py-0.5 text-[10px] transition"
        :class="
          wheelId === w.id
            ? 'bg-white/20 text-white'
            : 'text-white/50 hover:bg-white/10'
        "
        @click="emit('update:wheelId', w.id)"
      >
        {{ w.label }}
      </button>
    </div>
    <div v-if="liveries.length > 1" class="flex w-full flex-col gap-1">
      <span class="text-center text-[10px] text-white/45">涂装</span>
      <button
        v-for="l in liveries"
        :key="l.id"
        type="button"
        class="rounded px-1 py-0.5 text-[10px] transition"
        :class="
          liveryId === l.id
            ? 'bg-white/20 text-white'
            : 'text-white/50 hover:bg-white/10'
        "
        @click="emit('update:liveryId', l.id)"
      >
        {{ l.label }}
      </button>
    </div>
  </aside>
</template>
