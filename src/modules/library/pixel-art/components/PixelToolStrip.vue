<script setup lang="ts">
defineOptions({ name: 'PixelToolStrip' })

import WwIconButton from '@shared/components/WwIconButton.vue'
import type { WwIconName } from '@shared/icons/registry'
import type { ToolId } from '@modules/library/pixel-art/domain/tools'
import { PLACEHOLDER_TOOLS, toolTooltipLabel } from '@modules/library/pixel-art/domain/tools'
import { useWanwuToast } from '@shared/composables/useWanwuToast'

const props = defineProps<{
  activeTool: ToolId
}>()

const emit = defineEmits<{
  select: [tool: ToolId]
}>()

const toast = useWanwuToast()

interface ToolDef {
  id: ToolId
  icon: WwIconName
  disabled?: boolean
}

const toolGroups: ToolDef[][] = [
  [
    { id: 'pencil', icon: 'pencil' },
    { id: 'eraser', icon: 'eraser' }
  ],
  [
    { id: 'line', icon: 'slash' },
    { id: 'rect', icon: 'square' },
    { id: 'polygon', icon: 'hexagon', disabled: true },
    { id: 'ellipse', icon: 'circle' },
    { id: 'spline', icon: 'spline', disabled: true }
  ],
  [
    { id: 'fill', icon: 'paint-bucket' },
    { id: 'gradient', icon: 'blend' },
    { id: 'eyedropper', icon: 'pipette' }
  ],
  [
    { id: 'marquee', icon: 'square-arrow-up-left' },
    { id: 'move', icon: 'move' }
  ],
  [{ id: 'hand', icon: 'hand' }]
]

function pickTool(tool: ToolDef) {
  if (tool.disabled || PLACEHOLDER_TOOLS.has(tool.id)) {
    toast.info(`${toolTooltipLabel(tool.id, { placeholder: true })}`)
    return
  }
  emit('select', tool.id)
}

function tooltipFor(tool: ToolDef): string {
  return toolTooltipLabel(tool.id, {
    disabled: tool.disabled,
    placeholder: tool.disabled || PLACEHOLDER_TOOLS.has(tool.id)
  })
}
</script>

<template>
  <aside class="pa-tool-strip pa-panel-enter" aria-label="绘图工具">
    <template v-for="(group, gi) in toolGroups" :key="gi">
      <div v-if="gi > 0" class="pa-tool-strip__sep" aria-hidden="true" />
      <WwIconButton
        v-for="tool in group"
        :key="tool.id"
        :icon="tool.icon"
        icon-size="sm"
        :ariaLabel="tooltipFor(tool)"
        class="pa-tool-strip__btn"
        :class="{
          'pa-tool-strip__btn--active': props.activeTool === tool.id,
          'pa-tool-strip__btn--disabled': tool.disabled
        }"
        compact
        v-tooltip.right="tooltipFor(tool)"
        @click="pickTool(tool)"
      />
    </template>
  </aside>
</template>

<style scoped>
.pa-tool-strip__btn--disabled {
  opacity: 0.42;
}
</style>
