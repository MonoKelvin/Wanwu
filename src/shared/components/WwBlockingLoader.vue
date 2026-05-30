<script setup lang="ts">
import { Teleport } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'

withDefaults(
  defineProps<{
    visible?: boolean
    label?: string
    sublabel?: string
    /** true：仅盖住父级；false：全窗遮罩（与弹窗一致，默认） */
    local?: boolean
  }>(),
  {
    visible: false,
    label: '加载中…',
    sublabel: '',
    local: false
  }
)
</script>

<template>
  <Teleport v-if="!local" to="body" :disabled="!visible">
    <Transition name="ww-blocking-loader-fade">
      <div
        v-if="visible"
        class="ww-blocking-loader ww-blocking-loader--viewport"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div class="ww-blocking-loader__scrim" aria-hidden="true" />
        <div class="ww-blocking-loader__content">
          <WwIcon name="loader" size="lg" spin class="ww-blocking-loader__spinner" />
          <p v-if="label" class="ww-blocking-loader__label">{{ label }}</p>
          <p v-if="sublabel" class="ww-blocking-loader__sublabel">{{ sublabel }}</p>
        </div>
      </div>
    </Transition>
  </Teleport>
  <Transition v-else name="ww-blocking-loader-fade">
    <div
      v-if="visible"
      class="ww-blocking-loader"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="ww-blocking-loader__scrim" aria-hidden="true" />
      <div class="ww-blocking-loader__content">
        <WwIcon name="loader" size="lg" spin class="ww-blocking-loader__spinner" />
        <p v-if="label" class="ww-blocking-loader__label">{{ label }}</p>
        <p v-if="sublabel" class="ww-blocking-loader__sublabel">{{ sublabel }}</p>
      </div>
    </div>
  </Transition>
</template>

<style>
.ww-blocking-loader {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.ww-blocking-loader--viewport {
  position: fixed;
  inset: 0;
  z-index: 1200;
}

.ww-blocking-loader__scrim {
  position: absolute;
  inset: 0;
  background: var(--ww-overlay-scrim);
  backdrop-filter: blur(4px);
}

.ww-blocking-loader--viewport .ww-blocking-loader__scrim {
  backdrop-filter: blur(6px);
}

.ww-blocking-loader__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.625rem;
  max-width: min(18rem, 90%);
  padding: 1.25rem 1.5rem;
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--ww-panel) 94%, transparent);
  box-shadow: var(--ww-shadow-md);
  text-align: center;
}

.ww-blocking-loader__spinner {
  color: var(--ww-accent);
}

.ww-blocking-loader__label {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ww-ink);
}

.ww-blocking-loader__sublabel {
  margin: 0;
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  color: var(--ww-ink-muted);
}

.ww-blocking-loader-fade-enter-active,
.ww-blocking-loader-fade-leave-active {
  transition: opacity var(--ww-duration-normal) var(--ww-ease-out);
}

.ww-blocking-loader-fade-enter-from,
.ww-blocking-loader-fade-leave-to {
  opacity: 0;
}
</style>
