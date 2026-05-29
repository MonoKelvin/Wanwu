<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import type { NoteColor } from '@shared/types/notes'

const props = defineProps<{
  modelValue: NoteColor
  colors: NoteColor[]
  labels: Record<NoteColor, string>
}>()

const emit = defineEmits<{
  'update:modelValue': [color: NoteColor]
}>()

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
let hoverCloseTimer: ReturnType<typeof setTimeout> | null = null

function clearHoverTimer() {
  if (hoverCloseTimer) {
    clearTimeout(hoverCloseTimer)
    hoverCloseTimer = null
  }
}

function showPanel() {
  clearHoverTimer()
  open.value = true
}

function scheduleHide() {
  clearHoverTimer()
  hoverCloseTimer = setTimeout(() => {
    open.value = false
  }, 220)
}

function pick(color: NoteColor) {
  emit('update:modelValue', color)
  open.value = false
}

function onDocPointerDown(event: PointerEvent) {
  if (!open.value) return
  const root = rootRef.value
  if (root && !root.contains(event.target as Node)) {
    open.value = false
  }
}

document.addEventListener('pointerdown', onDocPointerDown, true)

onBeforeUnmount(() => {
  clearHoverTimer()
  document.removeEventListener('pointerdown', onDocPointerDown, true)
})
</script>

<template>
  <div
    ref="rootRef"
    class="ww-note-color-picker"
    @pointerenter="showPanel"
    @pointerleave="scheduleHide"
  >
    <button
      type="button"
      class="ww-note-color-picker__trigger"
      :class="`is-${modelValue}`"
      :aria-label="`${labels[modelValue]}（当前颜色，点击切换）`"
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click.stop="open = !open"
    />

    <div
      v-show="open"
      class="ww-note-color-picker__anchor"
      @pointerenter="showPanel"
      @pointerleave="scheduleHide"
    >
      <div class="ww-note-color-picker__panel" role="listbox" aria-label="便笺颜色">
        <button
          v-for="c in colors"
          :key="c"
          type="button"
          role="option"
          class="ww-note-color-picker__swatch"
          :class="[`is-${c}`, { 'is-selected': modelValue === c }]"
          :aria-label="labels[c]"
          :aria-selected="modelValue === c"
          @click.stop="pick(c)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.ww-note-color-picker {
  position: relative;
  flex-shrink: 0;
  -webkit-app-region: no-drag;
}

.ww-note-color-picker__trigger {
  display: block;
  width: 1.0625rem;
  height: 1.0625rem;
  padding: 0;
  border: 2px solid rgb(255 255 255 / 0.72);
  border-radius: 50%;
  cursor: pointer;
  box-sizing: border-box;
  box-shadow:
    0 0 0 1px rgb(0 0 0 / 0.14),
    0 1px 3px rgb(0 0 0 / 0.2),
    inset 0 1px 1px rgb(255 255 255 / 0.28);
}

[data-theme='dark'] .ww-note-color-picker__trigger {
  border-color: rgb(255 255 255 / 0.34);
  box-shadow:
    0 0 0 1px rgb(0 0 0 / 0.42),
    0 1px 4px rgb(0 0 0 / 0.36),
    inset 0 1px 1px rgb(255 255 255 / 0.12);
}

.ww-note-color-picker__anchor {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 30;
  padding-top: 0.375rem;
}

.ww-note-color-picker__panel {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  width: max-content;
  max-width: 11rem;
  padding: 0.5rem;
  border-radius: 0.625rem;
  border: 1px solid var(--ww-glass-border);
  background: var(--ww-glass-bg);
  box-shadow: var(--ww-shadow-md, 0 8px 24px rgb(0 0 0 / 0.12));
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.ww-note-color-picker__swatch {
  width: 1rem;
  height: 1rem;
  padding: 0;
  border: 2px solid rgb(255 255 255 / 0.62);
  border-radius: 50%;
  cursor: pointer;
  box-sizing: border-box;
  box-shadow:
    0 0 0 1px rgb(0 0 0 / 0.12),
    0 1px 2px rgb(0 0 0 / 0.16);
}

.ww-note-color-picker__swatch.is-selected {
  box-shadow:
    0 0 0 1px var(--ww-content),
    0 0 0 2px var(--ww-ink-muted),
    0 1px 3px rgb(0 0 0 / 0.18);
}

[data-theme='dark'] .ww-note-color-picker__swatch {
  border-color: rgb(255 255 255 / 0.28);
  box-shadow:
    0 0 0 1px rgb(0 0 0 / 0.38),
    0 1px 3px rgb(0 0 0 / 0.28);
}

.ww-note-color-picker__trigger.is-yellow,
.ww-note-color-picker__swatch.is-yellow {
  background: #dfb749;
}
.ww-note-color-picker__trigger.is-green,
.ww-note-color-picker__swatch.is-green {
  background: #4ab68a;
}
.ww-note-color-picker__trigger.is-blue,
.ww-note-color-picker__swatch.is-blue {
  background: #6a9fea;
}
.ww-note-color-picker__trigger.is-pink,
.ww-note-color-picker__swatch.is-pink {
  background: #e988b2;
}
.ww-note-color-picker__trigger.is-purple,
.ww-note-color-picker__swatch.is-purple {
  background: #aa95ea;
}
.ww-note-color-picker__trigger.is-gray,
.ww-note-color-picker__swatch.is-gray {
  background: #95a0b2;
}
.ww-note-color-picker__trigger.is-orange,
.ww-note-color-picker__swatch.is-orange {
  background: #ec9d56;
}
.ww-note-color-picker__trigger.is-teal,
.ww-note-color-picker__swatch.is-teal {
  background: #48c2ba;
}
.ww-note-color-picker__trigger.is-red,
.ww-note-color-picker__swatch.is-red {
  background: #e9827d;
}

[data-theme='dark'] .ww-note-color-picker__trigger.is-yellow,
[data-theme='dark'] .ww-note-color-picker__swatch.is-yellow {
  background: #e3b236;
}
[data-theme='dark'] .ww-note-color-picker__trigger.is-green,
[data-theme='dark'] .ww-note-color-picker__swatch.is-green {
  background: #4ab68a;
}
[data-theme='dark'] .ww-note-color-picker__trigger.is-blue,
[data-theme='dark'] .ww-note-color-picker__swatch.is-blue {
  background: #6ba2f0;
}
[data-theme='dark'] .ww-note-color-picker__trigger.is-pink,
[data-theme='dark'] .ww-note-color-picker__swatch.is-pink {
  background: #ec84ae;
}
[data-theme='dark'] .ww-note-color-picker__trigger.is-purple,
[data-theme='dark'] .ww-note-color-picker__swatch.is-purple {
  background: #a895ef;
}
[data-theme='dark'] .ww-note-color-picker__trigger.is-gray,
[data-theme='dark'] .ww-note-color-picker__swatch.is-gray {
  background: #98a2b3;
}
[data-theme='dark'] .ww-note-color-picker__trigger.is-orange,
[data-theme='dark'] .ww-note-color-picker__swatch.is-orange {
  background: #f2a04a;
}
[data-theme='dark'] .ww-note-color-picker__trigger.is-teal,
[data-theme='dark'] .ww-note-color-picker__swatch.is-teal {
  background: #3bc3ba;
}
[data-theme='dark'] .ww-note-color-picker__trigger.is-red,
[data-theme='dark'] .ww-note-color-picker__swatch.is-red {
  background: #f58884;
}
</style>
