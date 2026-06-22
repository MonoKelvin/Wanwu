<script setup lang="ts">
defineOptions({ name: 'PixelStatusBar' })

const props = defineProps<{
  width: number
  height: number
  zoom: number
  toolLabel: string
  cursorX: number
  cursorY: number
  foreground: string
  layerCount?: number
}>()
</script>

<template>
  <footer class="pixel-status-bar">
    <span>{{ props.width }}×{{ props.height }}</span>
    <span>{{ Math.round(props.zoom) }}%</span>
    <span v-if="layerCount != null">{{ layerCount }} 层</span>
    <span>{{ props.toolLabel }}</span>
    <span v-if="props.cursorX >= 0">({{ props.cursorX }}, {{ props.cursorY }})</span>
    <span v-else>(—)</span>
    <span class="color-swatch" :style="{ background: props.foreground }" />
    <span>{{ props.foreground }}</span>
  </footer>
</template>

<style scoped>
.pixel-status-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 28px;
  padding: 0 12px;
  font-size: 12px;
  color: var(--ww-text-muted);
  border-top: 1px solid var(--ww-border);
  background: var(--ww-surface);
}

.color-swatch {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid var(--ww-border);
}
</style>
