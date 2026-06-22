<script setup lang="ts">
defineOptions({ name: 'PixelToolStrip' })

import WwIconButton from '@shared/components/WwIconButton.vue'
import type { WwIconName } from '@shared/icons/registry'
import type { ToolId } from '@modules/library/pixel-art/domain/tools'
import { TOOL_LABELS } from '@modules/library/pixel-art/domain/tools'

const props = defineProps<{
  activeTool: ToolId
}>()

const emit = defineEmits<{
  select: [tool: ToolId]
}>()

const toolGroups: Array<Array<{ id: ToolId; icon: WwIconName }>> = [
  [
    { id: 'pencil', icon: 'pencil' },
    { id: 'eraser', icon: 'eraser' },
    { id: 'fill', icon: 'paintbrush' }
  ],
  [
    { id: 'line', icon: 'minus' },
    { id: 'rect', icon: 'square' },
    { id: 'ellipse', icon: 'disc-3' },
    { id: 'gradient', icon: 'sliders-horizontal' }
  ],
  [
    { id: 'marquee', icon: 'square-arrow-up-left' },
    { id: 'eyedropper', icon: 'palette' }
  ],
  [
    { id: 'hand', icon: 'hand' },
    { id: 'zoom', icon: 'maximize' }
  ]
]
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
        :ariaLabel="TOOL_LABELS[tool.id]"
        class="pa-tool-strip__btn"
        :class="{ 'pa-tool-strip__btn--active': props.activeTool === tool.id }"
        compact
        v-tooltip.right="TOOL_LABELS[tool.id]"
        @click="emit('select', tool.id)"
      />
    </template>
  </aside>
</template>
