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

const tools: Array<{ id: ToolId; icon: WwIconName }> = [
  { id: 'pencil', icon: 'pencil' },
  { id: 'eraser', icon: 'eraser' },
  { id: 'fill', icon: 'paintbrush' },
  { id: 'line', icon: 'minus' },
  { id: 'rect', icon: 'square' },
  { id: 'ellipse', icon: 'disc-3' },
  { id: 'gradient', icon: 'sliders-horizontal' },
  { id: 'marquee', icon: 'square-arrow-up-left' },
  { id: 'eyedropper', icon: 'palette' },
  { id: 'hand', icon: 'compass' },
  { id: 'zoom', icon: 'maximize' }
]
</script>

<template>
  <aside class="pixel-tool-strip">
    <WwIconButton
      v-for="tool in tools"
      :key="tool.id"
      :icon="tool.icon"
      :ariaLabel="TOOL_LABELS[tool.id]"
      :class="{ active: props.activeTool === tool.id }"
      @click="emit('select', tool.id)"
    />
  </aside>
</template>

<style scoped>
.pixel-tool-strip {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 48px;
  padding: 8px 4px;
  border-right: 1px solid var(--ww-border);
  background: var(--ww-surface);
}

.pixel-tool-strip :deep(.active) {
  background: var(--ww-accent-subtle);
}
</style>
