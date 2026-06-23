<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import WwNumberInput from '@shared/components/WwNumberInput/WwNumberInput.vue'
import WwColorWheelCore from '@shared/components/WwColorWheelCore.vue'
import { usePopTip } from '@shared/composables/usePopTip'
import { useSettingsStore } from '@shared/stores/settings'
import { describeColor } from '@shared/lib/colorDescriptiveName'
import {
  colorPreviewCss,
  formatHsva,
  formatHsvaHex,
  formatHsvaHsl,
  formatHsvaRgb,
  hsvaToParsed,
  hslToRgb,
  parseColor,
  parseColorToHsva,
  parsedToHsva,
  rgbToHsl,
  rgbToHsv,
  type ColorValueFormat,
  type HsvaColor
} from '@shared/lib/colorWithAlpha'

const props = withDefaults(
  defineProps<{
    modelValue: string
    mixed?: boolean
    allowTransparent?: boolean
    ariaLabel?: string
    block?: boolean
  }>(),
  {
    mixed: false,
    allowTransparent: false,
    block: true
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const FORMATS: ColorValueFormat[] = ['hex', 'rgb', 'hsl']

const popTip = usePopTip()
const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)
const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const hsva = ref<HsvaColor>(parseColorToHsva('#ffffff'))
const valueFormat = ref<ColorValueFormat>('hex')
const panelPos = ref({ top: 0, left: 0 })
const panelDragged = ref(false)

const panelStyle = computed(() => ({
  top: `${panelPos.value.top}px`,
  left: `${panelPos.value.left}px`
}))

const previewColor = computed(() => {
  if (props.mixed) return '#b0b0b0'
  if (open.value) {
    return colorPreviewCss(formatHsva(hsva.value, { transparentKeyword: props.allowTransparent }))
  }
  return colorPreviewCss(props.modelValue)
})

const colorName = computed(() => describeColor(hsva.value))

const headerDisplayValue = computed(() => {
  if (valueFormat.value === 'rgb') return formatHsvaRgb(hsva.value)
  if (valueFormat.value === 'hsl') return formatHsvaHsl(hsva.value)
  return formatHsvaHex(hsva.value)
})

const hexField = computed(() => formatHsvaHex(hsva.value))

const rgbFields = computed(() => {
  const c = hsvaToParsed(hsva.value)
  return {
    r: c.r,
    g: c.g,
    b: c.b,
    a: Math.round(c.a * 100)
  }
})

const hslFields = computed(() => {
  const c = hsvaToParsed(hsva.value)
  const { h, s, l } = rgbToHsl(c.r, c.g, c.b)
  return {
    h: Math.round(h),
    s: Math.round(s),
    l: Math.round(l),
    a: Math.round(c.a * 100)
  }
})

const recentColors = computed(() => settings.value.recentColors)

watch(
  () => props.modelValue,
  (value) => {
    if (open.value) return
    hsva.value = parseColorToHsva(value)
  }
)

function syncFromModel() {
  hsva.value = parseColorToHsva(props.modelValue)
}

function draftValue(): string {
  return formatHsva(hsva.value, { transparentKeyword: props.allowTransparent })
}

function commitDraft() {
  if (props.mixed) return
  const next = draftValue()
  if (next !== props.modelValue) {
    emit('update:modelValue', next)
  }
}

function patchHsva(patch: Partial<HsvaColor>) {
  hsva.value = { ...hsva.value, ...patch }
}

async function copyText(text: string, tip = '已复制') {
  try {
    await popTip.copyText(text, tip)
  } catch {
    /* ignore */
  }
}

async function updatePanelPosition() {
  await nextTick()
  const trigger = triggerRef.value
  const panel = panelRef.value
  if (!trigger || !panel) return

  const gap = 8
  const pad = 8
  const tr = trigger.getBoundingClientRect()
  const pw = panel.offsetWidth
  const ph = panel.offsetHeight

  let left = tr.right - pw
  let top = tr.bottom + gap

  if (top + ph > window.innerHeight - pad) {
    top = tr.top - ph - gap
  }

  panelPos.value = clampPanelPosition(top, left)
}

async function toggleOpen() {
  if (props.mixed) return
  if (open.value) {
    closePanel()
    return
  }
  open.value = true
  panelDragged.value = false
  syncFromModel()
  await updatePanelPosition()
}

function rememberRecentColor() {
  if (props.mixed) return
  const value = formatHsva(hsva.value, { transparentKeyword: props.allowTransparent })
  if (!value) return
  void settingsStore.appendRecentColor(value)
}

function applyRecentColor(color: string) {
  hsva.value = parseColorToHsva(color)
}

function closePanel() {
  if (!open.value) return
  commitDraft()
  rememberRecentColor()
  open.value = false
}

function onBackdropPointerDown(event: PointerEvent) {
  event.preventDefault()
  event.stopPropagation()
  closePanel()
}

function setValueFormat(format: ColorValueFormat) {
  valueFormat.value = format
}

function applyParsed(parsed: ReturnType<typeof parseColor>) {
  if (!parsed) return
  hsva.value = parsedToHsva(parsed)
}

function onHexInput(event: Event) {
  let text = (event.target as HTMLInputElement).value.trim()
  if (!text.startsWith('#')) text = `#${text}`
  applyParsed(parseColor(text))
}

function onRgbInput(channel: 'r' | 'g' | 'b' | 'a', value: number | null) {
  if (value === null || !Number.isFinite(value)) return
  const n = value
  const base = rgbFields.value
  const next = {
    ...base,
    [channel]: channel === 'a' ? Math.min(100, Math.max(0, n)) : Math.min(255, Math.max(0, n))
  }
  const { h, s, v } = rgbToHsv(next.r, next.g, next.b)
  patchHsva({ h, s, v, a: next.a / 100 })
}

function onHslInput(channel: 'h' | 's' | 'l' | 'a', value: number | null) {
  if (value === null || !Number.isFinite(value)) return
  const n = value
  const base = hslFields.value
  const next = {
    ...base,
    [channel]:
      channel === 'h'
        ? Math.min(360, Math.max(0, n))
        : channel === 'a'
          ? Math.min(100, Math.max(0, n))
          : Math.min(100, Math.max(0, n))
  }
  const { r, g, b } = hslToRgb(next.h, next.s, next.l)
  const { h, s, v } = rgbToHsv(r, g, b)
  patchHsva({ h, s, v, a: next.a / 100 })
}

let panelDragActive = false
let panelDragStart = { x: 0, y: 0, top: 0, left: 0 }

function clampPanelPosition(top: number, left: number) {
  const pad = 8
  const panel = panelRef.value
  if (!panel) return { top, left }
  const pw = panel.offsetWidth
  const ph = panel.offsetHeight
  return {
    left: Math.min(Math.max(pad, left), Math.max(pad, window.innerWidth - pw - pad)),
    top: Math.min(Math.max(pad, top), Math.max(pad, window.innerHeight - ph - pad))
  }
}

function onPanelDragMove(event: PointerEvent) {
  if (!panelDragActive) return
  event.preventDefault()
  const dx = event.clientX - panelDragStart.x
  const dy = event.clientY - panelDragStart.y
  panelPos.value = clampPanelPosition(panelDragStart.top + dy, panelDragStart.left + dx)
}

function endPanelDrag(event: PointerEvent) {
  if (!panelDragActive) return
  const el = panelRef.value
  if (el?.hasPointerCapture(event.pointerId)) {
    el.releasePointerCapture(event.pointerId)
  }
  cleanupPanelDrag()
}

function cleanupPanelDrag() {
  document.removeEventListener('pointermove', onPanelDragMove)
  document.removeEventListener('pointerup', endPanelDrag)
  document.removeEventListener('pointercancel', endPanelDrag)
  panelDragActive = false
}

function startPanelDrag(event: PointerEvent) {
  if (props.mixed || event.button !== 0) return
  if ((event.target as HTMLElement).closest('button')) return

  panelDragActive = true
  panelDragged.value = true
  panelDragStart = {
    x: event.clientX,
    y: event.clientY,
    top: panelPos.value.top,
    left: panelPos.value.left
  }

  const panel = panelRef.value
  panel?.setPointerCapture(event.pointerId)
  event.preventDefault()
  document.addEventListener('pointermove', onPanelDragMove)
  document.addEventListener('pointerup', endPanelDrag)
  document.addEventListener('pointercancel', endPanelDrag)
}

function onKeydown(event: KeyboardEvent) {
  if (!open.value || event.key !== 'Escape') return
  event.preventDefault()
  event.stopPropagation()
  closePanel()
}

function onWindowChange() {
  if (!open.value) return
  if (panelDragged.value) {
    panelPos.value = clampPanelPosition(panelPos.value.top, panelPos.value.left)
    return
  }
  void updatePanelPosition()
}

watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener('keydown', onKeydown, true)
    window.addEventListener('scroll', onWindowChange, true)
    window.addEventListener('resize', onWindowChange)
  } else {
    document.removeEventListener('keydown', onKeydown, true)
    window.removeEventListener('scroll', onWindowChange, true)
    window.removeEventListener('resize', onWindowChange)
    cleanupPanelDrag()
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown, true)
  window.removeEventListener('scroll', onWindowChange, true)
  window.removeEventListener('resize', onWindowChange)
  cleanupPanelDrag()
})
</script>

<template>
  <div
    ref="rootRef"
    class="ww-color-input"
    :class="{
      'ww-color-input--block': block,
      'ww-color-input--mixed': mixed,
      'ww-color-input--open': open
    }"
  >
    <button
      ref="triggerRef"
      type="button"
      class="ww-color-input__trigger"
      :disabled="mixed"
      :aria-label="ariaLabel"
      :aria-expanded="open"
      aria-haspopup="dialog"
      @click="toggleOpen"
    >
      <span class="ww-color-input__checker" aria-hidden="true" />
      <span class="ww-color-input__preview" :style="{ backgroundColor: previewColor }" aria-hidden="true" />
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        class="ww-color-input__backdrop"
        aria-hidden="true"
        @pointerdown="onBackdropPointerDown"
      />
      <Transition name="ww-color-input-pop">
        <div
          v-if="open"
          ref="panelRef"
          class="ww-color-input__panel ww-glass-blur"
          role="dialog"
          :style="panelStyle"
          :aria-label="ariaLabel ?? '颜色'"
          @click.stop
        >
          <header class="ww-color-input__head" @pointerdown="startPanelDrag">
            <span class="ww-color-input__head-swatch" aria-hidden="true">
              <span class="ww-color-input__checker ww-color-input__checker--sm" />
              <span
                class="ww-color-input__preview"
                :style="{ backgroundColor: colorPreviewCss(formatHsva(hsva)) }"
              />
            </span>
            <div class="ww-color-input__head-meta">
              <button
                type="button"
                class="ww-color-input__head-name"
                :title="`复制「${colorName}」`"
                @pointerdown.stop
                @click="copyText(colorName, '已复制颜色名称')"
              >
                {{ colorName }}
              </button>
              <button
                type="button"
                class="ww-color-input__head-value"
                :title="`复制 ${headerDisplayValue}`"
                @pointerdown.stop
                @click="copyText(headerDisplayValue, '已复制颜色值')"
              >
                {{ headerDisplayValue }}
              </button>
            </div>
          </header>

          <WwColorWheelCore :hsva="hsva" @update:hsva="(v) => (hsva = v)" />

          <div v-if="recentColors.length" class="ww-color-input__recent">
            <span class="ww-color-input__recent-label">最近</span>
            <div class="ww-color-input__recent-row" role="list">
              <button
                v-for="color in recentColors"
                :key="color"
                type="button"
                role="listitem"
                class="ww-color-input__recent-swatch"
                :style="{ backgroundColor: colorPreviewCss(color) }"
                :aria-label="`最近颜色 ${color}`"
                @click="applyRecentColor(color)"
              />
            </div>
          </div>

          <footer class="ww-color-input__footer">
            <div class="ww-color-input__formats" role="tablist" aria-label="输入格式">
              <button
                v-for="format in FORMATS"
                :key="format"
                type="button"
                role="tab"
                class="ww-color-input__format"
                :class="{ 'ww-color-input__format--active': valueFormat === format }"
                :aria-selected="valueFormat === format"
                @click="setValueFormat(format)"
              >
                {{ format.toUpperCase() }}
              </button>
            </div>

            <div v-if="valueFormat === 'hex'" class="ww-color-input__fields">
              <input
                class="ww-color-input__field ww-color-input__field--hex"
                type="text"
                spellcheck="false"
                :value="hexField"
                aria-label="HEX 颜色值"
                @change="onHexInput"
              />
            </div>

            <div v-else-if="valueFormat === 'rgb'" class="ww-color-input__fields ww-color-input__fields--grid">
              <label class="ww-color-input__field-wrap">
                <span>R</span>
                <WwNumberInput
                  :model-value="rgbFields.r"
                  size="compact"
                  :min="0"
                  :max="255"
                  @update:model-value="onRgbInput('r', $event)"
                />
              </label>
              <label class="ww-color-input__field-wrap">
                <span>G</span>
                <WwNumberInput
                  :model-value="rgbFields.g"
                  size="compact"
                  :min="0"
                  :max="255"
                  @update:model-value="onRgbInput('g', $event)"
                />
              </label>
              <label class="ww-color-input__field-wrap">
                <span>B</span>
                <WwNumberInput
                  :model-value="rgbFields.b"
                  size="compact"
                  :min="0"
                  :max="255"
                  @update:model-value="onRgbInput('b', $event)"
                />
              </label>
              <label class="ww-color-input__field-wrap">
                <span>A</span>
                <WwNumberInput
                  :model-value="rgbFields.a"
                  size="compact"
                  :min="0"
                  :max="100"
                  @update:model-value="onRgbInput('a', $event)"
                />
              </label>
            </div>

            <div v-else class="ww-color-input__fields ww-color-input__fields--grid">
              <label class="ww-color-input__field-wrap">
                <span>H</span>
                <WwNumberInput
                  :model-value="hslFields.h"
                  size="compact"
                  :min="0"
                  :max="360"
                  @update:model-value="onHslInput('h', $event)"
                />
              </label>
              <label class="ww-color-input__field-wrap">
                <span>S</span>
                <WwNumberInput
                  :model-value="hslFields.s"
                  size="compact"
                  :min="0"
                  :max="100"
                  @update:model-value="onHslInput('s', $event)"
                />
              </label>
              <label class="ww-color-input__field-wrap">
                <span>L</span>
                <WwNumberInput
                  :model-value="hslFields.l"
                  size="compact"
                  :min="0"
                  :max="100"
                  @update:model-value="onHslInput('l', $event)"
                />
              </label>
              <label class="ww-color-input__field-wrap">
                <span>A</span>
                <WwNumberInput
                  :model-value="hslFields.a"
                  size="compact"
                  :min="0"
                  :max="100"
                  @update:model-value="onHslInput('a', $event)"
                />
              </label>
            </div>
          </footer>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.ww-color-input {
  position: relative;
  min-width: 0;
}

.ww-color-input--block {
  width: 100%;
  min-width: 0;
}

.ww-color-input__trigger {
  position: relative;
  display: block;
  width: 100%;
  min-width: 100%;
  height: var(--ww-select-height, 2.125rem);
  min-height: var(--ww-select-height, 2.125rem);
  padding: 0;
  border: 1px solid var(--ww-border-subtle);
  border-radius: var(--dg-prop-radius, var(--dg-radius, 0.4375rem));
  background: transparent;
  overflow: hidden;
  cursor: pointer;
}

.ww-color-input__trigger:disabled {
  cursor: not-allowed;
}

.ww-color-input__checker {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(45deg, rgb(0 0 0 / 0.08) 25%, transparent 25%),
    linear-gradient(-45deg, rgb(0 0 0 / 0.08) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgb(0 0 0 / 0.08) 75%),
    linear-gradient(-45deg, transparent 75%, rgb(0 0 0 / 0.08) 75%);
  background-size: 0.5rem 0.5rem;
  background-position:
    0 0,
    0 0.25rem,
    0.25rem -0.25rem,
    -0.25rem 0;
  background-color: var(--ww-inset, #fff);
}

.ww-color-input__checker--sm {
  border-radius: 0.3125rem;
}

.ww-color-input__preview {
  position: absolute;
  inset: 0;
}

.ww-color-input__backdrop {
  position: fixed;
  inset: 0;
  z-index: calc(var(--ww-z-popover, 10045) - 1);
  background: transparent;
  touch-action: none;
}

.ww-color-input__panel {
  position: fixed;
  z-index: var(--ww-z-popover, 10045);
  width: 16rem;
  padding: 0.75rem;
  border-radius: 0.75rem;
  background: transparent;
  box-shadow:
    var(--ww-menu-shadow, 0 18px 44px -6px rgb(18 18 22 / 0.16)),
    0 24px 64px -16px rgb(18 18 22 / 0.22);
}

.ww-color-input__panel.ww-glass-blur::before {
  background: var(--ww-glass-bg-soft);
  backdrop-filter: blur(var(--ww-blur-strong, 40px)) saturate(1.55);
  -webkit-backdrop-filter: blur(var(--ww-blur-strong, 40px)) saturate(1.55);
}

.ww-color-input__panel {
  cursor: default;
  user-select: none;
}

.ww-color-input__head {
  display: flex;
  align-items: stretch;
  gap: 0.625rem;
  margin-bottom: 0.625rem;
  cursor: grab;
  touch-action: none;
}

.ww-color-input__head:active {
  cursor: grabbing;
}

.ww-color-input__head-swatch {
  position: relative;
  flex-shrink: 0;
  width: 2.125rem;
  align-self: stretch;
  border-radius: 0.4375rem;
  border: 1px solid var(--ww-border-subtle);
  overflow: hidden;
}

.ww-color-input__head-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.125rem;
  padding-block: 0.0625rem;
}

.ww-color-input__head-name,
.ww-color-input__head-value {
  width: fit-content;
  max-width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  user-select: text;
  transition: color var(--ww-duration-fast, 0.16s) var(--ww-ease-out, ease);
}

.ww-color-input__head-name:hover,
.ww-color-input__head-value:hover {
  color: var(--ww-accent-hover, var(--ww-ink));
}

.ww-color-input__head-name {
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.25;
  color: var(--ww-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ww-color-input__head-value {
  font-size: 0.6875rem;
  font-weight: 500;
  line-height: 1.25;
  font-variant-numeric: tabular-nums;
  color: var(--ww-ink-muted);
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ww-color-input__sv {
  position: relative;
  height: 7.75rem;
  border-radius: 0.4375rem;
  overflow: hidden;
  touch-action: none;
  cursor: crosshair;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.06);
}

.ww-color-input__sv-pointer {
  position: absolute;
  z-index: 1;
  width: 0.875rem;
  height: 0.875rem;
  margin: -0.4375rem 0 0 -0.4375rem;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.35);
  pointer-events: none;
}

.ww-color-input__sliders {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  margin-top: 0.625rem;
}

.ww-color-input__slider {
  position: relative;
  height: 1.125rem;
  touch-action: none;
  cursor: pointer;
}

.ww-color-input__slider-track {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 0.625rem;
  margin-top: -0.3125rem;
  border-radius: 999px;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.08);
}

.ww-color-input__slider-track--hue {
  background: linear-gradient(
    to right,
    #f00 0%,
    #ff0 17%,
    #0f0 33%,
    #0ff 50%,
    #00f 67%,
    #f0f 83%,
    #f00 100%
  );
}

.ww-color-input__alpha-checker {
  position: absolute;
  inset: 0;
  background-color: #fff;
  background-image:
    linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%),
    linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%);
  background-size: 0.5rem 0.5rem;
  background-position:
    0 0,
    0.25rem 0.25rem;
}

.ww-color-input__alpha-gradient {
  position: absolute;
  inset: 0;
}

.ww-color-input__slider-pointer {
  position: absolute;
  top: 50%;
  z-index: 2;
  width: 0.8125rem;
  height: 0.8125rem;
  margin: -0.40625rem 0 0 -0.40625rem;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.35);
  pointer-events: none;
}

.ww-color-input__recent {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.625rem;
}

.ww-color-input__recent-label {
  flex: 0 0 auto;
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--ww-ink-faint);
  letter-spacing: 0.04em;
}

.ww-color-input__recent-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3125rem;
  min-width: 0;
}

.ww-color-input__recent-swatch {
  width: 1.125rem;
  height: 1.125rem;
  padding: 0;
  border: 1px solid var(--ww-border-subtle);
  border-radius: 0.3125rem;
  cursor: pointer;
  transition:
    transform var(--ww-duration-fast, 0.16s) var(--ww-ease-out, ease),
    border-color var(--ww-duration-fast, 0.16s) var(--ww-ease-out, ease);
}

.ww-color-input__recent-swatch:hover {
  transform: scale(1.08);
  border-color: var(--ww-accent);
}

.ww-color-input__footer {
  margin-top: 0.6875rem;
  padding-top: 0.6875rem;
  border-top: 1px solid var(--ww-border-faint);
}

.ww-color-input__formats {
  display: flex;
  gap: 0.125rem;
  padding: 0.125rem;
  margin-bottom: 0.4375rem;
  border-radius: 0.4375rem;
  background: var(--ww-inset);
}

.ww-color-input__format {
  flex: 1;
  min-width: 0;
  padding: 0.3125rem 0.375rem;
  border: none;
  border-radius: 0.3125rem;
  background: transparent;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--ww-ink-muted);
  cursor: pointer;
  transition:
    background var(--ww-duration-fast, 0.16s) var(--ww-ease-out, ease),
    color var(--ww-duration-fast, 0.16s) var(--ww-ease-out, ease);
}

.ww-color-input__format--active {
  color: var(--ww-ink);
  background: var(--ww-content);
  box-shadow: 0 1px 2px rgb(18 18 22 / 0.08);
}

.ww-color-input__fields--grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.375rem;
}

.ww-color-input__field-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.1875rem;
  min-width: 0;
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--ww-ink-muted);
}

.ww-color-input__field-wrap .ww-number-input-root {
  width: 100%;
}

.ww-color-input__field {
  width: 100%;
  min-width: 0;
  padding: 0.375rem 0.3125rem;
  border: 1px solid var(--ww-border-subtle);
  border-radius: 0.375rem;
  background: var(--ww-inset);
  color: var(--ww-ink);
  font-size: 0.6875rem;
  font-variant-numeric: tabular-nums;
  user-select: text;
  transition: border-color var(--ww-duration-fast, 0.16s) var(--ww-ease-out, ease);
}

.ww-color-input__field--hex {
  font-size: 0.75rem;
  letter-spacing: 0.03em;
  padding-inline: 0.4375rem;
}

.ww-color-input__field:focus {
  outline: none;
  border-color: var(--ww-accent);
}

.ww-color-input--mixed .ww-color-input__trigger {
  opacity: 0.72;
}

.ww-color-input--mixed .ww-color-input__trigger::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    -45deg,
    transparent,
    transparent 4px,
    color-mix(in srgb, var(--ww-ink-muted) 18%, transparent) 4px,
    color-mix(in srgb, var(--ww-ink-muted) 18%, transparent) 8px
  );
  pointer-events: none;
}

[data-theme='dark'] .ww-color-input__trigger,
[data-theme='dark'] .ww-color-input__head-swatch {
  border-color: var(--ww-glass-border);
}

[data-theme='dark'] .ww-color-input__checker {
  background-color: rgb(255 255 255 / 0.04);
}

[data-theme='dark'] .ww-color-input__sv {
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.08);
}

[data-theme='dark'] .ww-color-input__slider-track {
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.1);
}

[data-theme='dark'] .ww-color-input__alpha-checker {
  background-color: #3a3a40;
  background-image:
    linear-gradient(45deg, #52525a 25%, transparent 25%, transparent 75%, #52525a 75%),
    linear-gradient(45deg, #52525a 25%, transparent 25%, transparent 75%, #52525a 75%);
}

[data-theme='dark'] .ww-color-input__formats {
  background: rgb(255 255 255 / 0.04);
}

[data-theme='dark'] .ww-color-input__field {
  border-color: var(--ww-glass-border);
  background: rgb(255 255 255 / 0.04);
  color: var(--ww-ink);
}

[data-theme='dark'] .ww-color-input__field:focus {
  border-color: color-mix(in srgb, var(--ww-accent) 65%, var(--ww-glass-border));
}

[data-theme='dark'] .ww-color-input__panel.ww-glass-blur::before {
  background: var(--ww-glass-bg-soft);
  backdrop-filter: blur(var(--ww-blur-strong, 40px)) saturate(1.35) brightness(0.96);
  -webkit-backdrop-filter: blur(var(--ww-blur-strong, 40px)) saturate(1.35) brightness(0.96);
}

[data-theme='dark'] .ww-color-input__panel {
  box-shadow:
    var(--ww-menu-shadow, 0 18px 44px -6px rgb(0 0 0 / 0.55)),
    0 28px 72px -18px rgb(0 0 0 / 0.62);
}

[data-theme='dark'] .ww-color-input__format--active {
  background: rgb(255 255 255 / 0.08);
  box-shadow: none;
}

:global(.ww-color-input-pop-enter-active),
:global(.ww-color-input-pop-leave-active) {
  transition:
    opacity 0.18s var(--ww-ease-out, cubic-bezier(0.22, 1, 0.36, 1)),
    transform 0.18s var(--ww-ease-out, cubic-bezier(0.22, 1, 0.36, 1));
}

:global(.ww-color-input-pop-enter-from),
:global(.ww-color-input-pop-leave-to) {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}
</style>
