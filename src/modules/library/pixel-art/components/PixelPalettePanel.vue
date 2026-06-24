<script setup lang="ts">
defineOptions({ name: 'PixelPalettePanel' })

import { computed, ref, watch } from 'vue'
import WwColorWheelCore, { type WwColorWheelMode } from '@shared/components/WwColorWheelCore.vue'
import WwPaletteGroupPanel from '@shared/components/WwPaletteGroupPanel.vue'
import WwIconButton from '@shared/components/WwIconButton.vue'
import { useGlobalColorPalettes } from '@shared/composables/useGlobalColorPalettes'
import { usePopTip } from '@shared/composables/usePopTip'
import {
  colorPreviewCss,
  formatHsva,
  formatHsvaHex,
  hsvaToParsed,
  parseColorToHsva,
  type HsvaColor
} from '@shared/lib/colorWithAlpha'

const props = defineProps<{
  foreground: string
}>()

const emit = defineEmits<{
  pick: [color: string]
}>()

const popTip = usePopTip()
const { groups, addColorToGroup, createCustomGroup } = useGlobalColorPalettes()
const hsva = ref<HsvaColor>(parseColorToHsva(props.foreground))
const wheelMode = ref<WwColorWheelMode>('square')

watch(
  () => props.foreground,
  (color) => {
    hsva.value = parseColorToHsva(color)
  }
)

watch(
  hsva,
  (v) => {
    const next = formatHsva(v)
    if (next !== props.foreground) emit('pick', next)
  },
  { deep: true }
)

const currentColor = computed(() => formatHsva(hsva.value))
const rgbLine = computed(() => {
  const c = hsvaToParsed(hsva.value)
  return `rgb(${c.r}, ${c.g}, ${c.b})`
})
const hexLine = computed(() => formatHsvaHex(hsva.value))

async function addCurrentToCustom() {
  await createCustomGroup('我的色板', [currentColor.value])
}

function onDragCurrentColor(event: DragEvent) {
  event.dataTransfer?.setData('text/plain', currentColor.value)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'
}

async function copyText(text: string, tip: string) {
  try {
    await popTip.copyText(text, tip)
  } catch {
    /* ignore */
  }
}
</script>

<template>
  <div class="pa-dock-panel pa-dock-panel--palette">
    <div class="pa-palette-panel__meta">
      <button
        type="button"
        class="pa-palette-panel__swatch"
        draggable="true"
        :style="{ backgroundColor: colorPreviewCss(currentColor) }"
        :title="`${currentColor}（可拖拽到色板）`"
        @dragstart="onDragCurrentColor"
      />
      <div class="pa-palette-panel__values">
        <button type="button" class="pa-palette-panel__line" @click="copyText(rgbLine, '已复制 RGB')">
          {{ rgbLine }}
        </button>
        <button type="button" class="pa-palette-panel__line" @click="copyText(hexLine, '已复制 HEX')">
          {{ hexLine }}
        </button>
      </div>
      <WwIconButton
        icon="save"
        class="pa-palette-panel__save"
        ariaLabel="保存到色板"
        compact
        v-tooltip.bottom="'保存到色板'"
        @click="addCurrentToCustom"
      />
    </div>

    <WwColorWheelCore v-model:hsva="hsva" v-model:mode="wheelMode" />

    <WwPaletteGroupPanel
      :groups="groups"
      :add-color="currentColor"
      @pick="emit('pick', $event)"
      @add-to-group="addColorToGroup"
    />
  </div>
</template>

<style scoped>
.pa-palette-panel__meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid var(--ww-border-subtle);
}

.pa-palette-panel__swatch {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: 1px solid var(--ww-border-subtle);
  border-radius: 0.375rem;
  cursor: grab;
}

.pa-palette-panel__values {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
  flex: 1 1 auto;
  align-items: flex-start;
}

.pa-palette-panel__line {
  padding: 0;
  border: none;
  background: transparent;
  font-size: 0.6875rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  line-height: 1.35;
  color: var(--ww-ink-muted);
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pa-palette-panel__line:hover {
  color: var(--ww-ink);
}

.pa-palette-panel__save {
  flex-shrink: 0;
  margin-left: auto;
}
</style>
