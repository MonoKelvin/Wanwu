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
  <div class="pa-palette-panel">
    <header class="pa-palette-panel__head">
      <div class="pa-palette-panel__current">
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
      </div>
      <WwIconButton
        icon="save"
        ariaLabel="保存到色板"
        compact
        v-tooltip.bottom="'保存到色板'"
        @click="addCurrentToCustom"
      />
    </header>

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
.pa-palette-panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem 0.5rem;
  overflow: auto;
  min-height: 0;
  flex: 1;
}

.pa-palette-panel__head {
  display: flex;
  align-items: flex-start;
  gap: 0.375rem;
}

.pa-palette-panel__current {
  display: flex;
  align-items: center;
  gap: 0.4375rem;
  flex: 1;
  min-width: 0;
}

.pa-palette-panel__swatch {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: 1px solid var(--ww-border-subtle);
  border-radius: 0.3125rem;
  cursor: grab;
}

.pa-palette-panel__values {
  display: flex;
  flex-direction: column;
  gap: 0.0625rem;
  min-width: 0;
}

.pa-palette-panel__line {
  padding: 0;
  border: none;
  background: transparent;
  font-size: 0.625rem;
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
</style>
