<script setup lang="ts">
import WwButton from '@shared/components/WwButton.vue'

const enabled = defineModel<boolean>({ required: true })

defineProps<{
  syncing?: boolean
}>()
</script>

<template>
  <WwButton
    type="button"
    icon="zap"
    size="small"
    :variant="enabled ? 'outlined' : 'text'"
    :severity="enabled ? 'primary' : 'secondary'"
    class="ww-live-sync-btn"
    :class="{
      'ww-live-sync-btn--on': enabled,
      'ww-live-sync-btn--pulse': enabled
    }"
    :aria-pressed="enabled"
    aria-label="实时同步"
    v-tooltip.bottom="
      enabled ? '实时同步已开启：自动监听外部收藏夹变更' : '实时同步已关闭'
    "
    @click="enabled = !enabled"
  />
</template>

<style>
.ww-live-sync-btn--on.p-button {
  background: var(--ww-list-selected-bg) !important;
  border-color: var(--ww-list-hover-ring) !important;
  color: var(--ww-accent) !important;
}

.ww-live-sync-btn--pulse.p-button {
  position: relative;
  overflow: visible;
}

.ww-live-sync-btn--pulse.p-button::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: inherit;
  border: 1px solid color-mix(in srgb, var(--ww-accent) 55%, transparent);
  animation: ww-live-sync-ripple 2s var(--ww-ease-out) infinite;
  pointer-events: none;
}

@keyframes ww-live-sync-ripple {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(1);
  }
  50% {
    opacity: 0.85;
    transform: scale(1.08);
  }
}
</style>
