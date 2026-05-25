<script setup lang="ts">
import WwButton from '@shared/components/WwButton.vue'
import WwIcon from '@shared/components/WwIcon.vue'

const enabled = defineModel<boolean>({ required: true })

defineProps<{
  syncing?: boolean
}>()
</script>

<template>
  <span
    class="ww-live-sync-btn-wrap"
    :class="{
      'ww-live-sync-btn-wrap--on': enabled,
      'ww-live-sync-btn-wrap--syncing': syncing
    }"
  >
    <span class="ww-live-sync-btn-wrap__halo" aria-hidden="true" />
    <span class="ww-live-sync-btn-wrap__ring ww-live-sync-btn-wrap__ring--a" aria-hidden="true" />
    <span class="ww-live-sync-btn-wrap__ring ww-live-sync-btn-wrap__ring--b" aria-hidden="true" />
    <WwButton
      type="button"
      size="small"
      :variant="enabled ? undefined : 'text'"
      :severity="enabled ? 'primary' : 'secondary'"
      class="ww-live-sync-btn"
      :aria-pressed="enabled"
      :aria-busy="syncing"
      aria-label="实时同步"
      v-tooltip.bottom="
        syncing ?
          '正在同步收藏夹…'
        : enabled ?
          '实时同步已开启：自动监听浏览器收藏夹变更'
        : '实时同步已关闭'
      "
      @click="enabled = !enabled"
    >
      <template #default>
        <span class="ww-live-sync-btn__icon-slot">
          <WwIcon
            name="zap"
            size="sm"
            class="ww-live-sync-btn__zap"
            :class="{ 'ww-live-sync-btn__zap--active': enabled || syncing }"
          />
        </span>
      </template>
    </WwButton>
  </span>
</template>

<style>
.ww-live-sync-btn-wrap {
  --ww-live-sync-ring: color-mix(in srgb, var(--ww-accent) 52%, transparent);
  --ww-live-sync-halo: color-mix(in srgb, var(--ww-accent) 38%, transparent);
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: visible;
  width: var(--ww-toolbar-h, 2.125rem);
  height: var(--ww-toolbar-h, 2.125rem);
}

.ww-live-sync-btn-wrap__halo,
.ww-live-sync-btn-wrap__ring {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 100%;
  height: 100%;
  border-radius: 0.5rem;
  pointer-events: none;
  opacity: 0;
}

.ww-live-sync-btn-wrap__halo {
  z-index: 0;
  background: radial-gradient(
    circle at 50% 50%,
    var(--ww-live-sync-halo) 0%,
    transparent 72%
  );
}

.ww-live-sync-btn-wrap--on .ww-live-sync-btn-wrap__halo,
.ww-live-sync-btn-wrap--syncing .ww-live-sync-btn-wrap__halo {
  animation: ww-live-sync-halo 2s ease-in-out infinite;
}

.ww-live-sync-btn-wrap__ring {
  z-index: 0;
  border: 1.5px solid var(--ww-live-sync-ring);
}

.ww-live-sync-btn-wrap--on .ww-live-sync-btn-wrap__ring--a,
.ww-live-sync-btn-wrap--syncing .ww-live-sync-btn-wrap__ring--a {
  animation: ww-live-sync-ring 2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}

.ww-live-sync-btn-wrap--on .ww-live-sync-btn-wrap__ring--b,
.ww-live-sync-btn-wrap--syncing .ww-live-sync-btn-wrap__ring--b {
  animation: ww-live-sync-ring 2s cubic-bezier(0.22, 1, 0.36, 1) infinite 0.7s;
}

.ww-live-sync-btn-wrap--syncing .ww-live-sync-btn-wrap__halo {
  animation-duration: 1.1s;
}

.ww-live-sync-btn-wrap--syncing .ww-live-sync-btn-wrap__ring--a {
  animation-duration: 1.15s;
}

.ww-live-sync-btn-wrap--syncing .ww-live-sync-btn-wrap__ring--b {
  animation-duration: 1.15s;
  animation-delay: 0.4s;
}

.ww-live-sync-btn {
  position: relative;
  z-index: 1;
  width: 100% !important;
  min-width: 100% !important;
  padding: 0 !important;
}

.ww-live-sync-btn__icon-slot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.125rem;
  height: 1.125rem;
}

.ww-live-sync-btn__zap {
  transition:
    transform 0.2s var(--ww-ease-out),
    filter 0.2s var(--ww-ease-out);
}

.ww-live-sync-btn__zap--active {
  color: var(--ww-content);
  animation: ww-live-sync-zap 1.8s ease-in-out infinite;
}

.ww-live-sync-btn-wrap--syncing .ww-live-sync-btn__zap--active {
  animation: ww-live-sync-zap-sync 0.9s ease-in-out infinite;
}

.ww-live-sync-btn-wrap--on :deep(.p-button:not(.p-button-text)) {
  background: var(--ww-accent) !important;
  border-color: var(--ww-accent) !important;
  color: var(--ww-content) !important;
  animation: ww-live-sync-btn-glow 2s ease-in-out infinite;
}

.ww-live-sync-btn-wrap--syncing :deep(.p-button:not(.p-button-text)) {
  animation: ww-live-sync-btn-glow 1.1s ease-in-out infinite;
}

.ww-live-sync-btn-wrap--on :deep(.p-button:not(.p-button-text):hover) {
  background: var(--ww-accent-hover) !important;
  border-color: var(--ww-accent-hover) !important;
}

@keyframes ww-live-sync-halo {
  0%,
  100% {
    opacity: 0.45;
    transform: scale(0.94);
  }
  50% {
    opacity: 1;
    transform: scale(1.22);
  }
}

@keyframes ww-live-sync-ring {
  0% {
    opacity: 0.9;
    transform: scale(1);
  }
  75% {
    opacity: 0;
    transform: scale(1.58);
  }
  100% {
    opacity: 0;
    transform: scale(1.58);
  }
}

@keyframes ww-live-sync-zap {
  0%,
  100% {
    transform: scale(1) rotate(0deg);
    filter: drop-shadow(0 0 0 transparent);
  }
  35% {
    transform: scale(1.12) rotate(-8deg);
    filter: drop-shadow(0 0 4px var(--ww-live-sync-halo));
  }
  70% {
    transform: scale(1.08) rotate(6deg);
    filter: drop-shadow(0 0 6px var(--ww-live-sync-ring));
  }
}

@keyframes ww-live-sync-zap-sync {
  0%,
  100% {
    transform: scale(1) rotate(0deg);
    filter: drop-shadow(0 0 3px var(--ww-live-sync-halo));
  }
  50% {
    transform: scale(1.16) rotate(12deg);
    filter: drop-shadow(0 0 8px var(--ww-live-sync-ring));
  }
}

@keyframes ww-live-sync-btn-glow {
  0%,
  100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--ww-accent) 30%, transparent);
  }
  50% {
    box-shadow: 0 0 10px 2px color-mix(in srgb, var(--ww-accent) 42%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ww-live-sync-btn-wrap--on .ww-live-sync-btn-wrap__halo,
  .ww-live-sync-btn-wrap--syncing .ww-live-sync-btn-wrap__halo,
  .ww-live-sync-btn-wrap--on .ww-live-sync-btn-wrap__ring--a,
  .ww-live-sync-btn-wrap--on .ww-live-sync-btn-wrap__ring--b,
  .ww-live-sync-btn-wrap--syncing .ww-live-sync-btn-wrap__ring--a,
  .ww-live-sync-btn-wrap--syncing .ww-live-sync-btn-wrap__ring--b,
  .ww-live-sync-btn__zap--active,
  .ww-live-sync-btn-wrap--on :deep(.p-button:not(.p-button-text)),
  .ww-live-sync-btn-wrap--syncing :deep(.p-button:not(.p-button-text)) {
    animation: none;
  }

  .ww-live-sync-btn-wrap--on .ww-live-sync-btn-wrap__halo,
  .ww-live-sync-btn-wrap--syncing .ww-live-sync-btn-wrap__halo {
    opacity: 0.65;
    transform: scale(1.08);
  }
}
</style>
