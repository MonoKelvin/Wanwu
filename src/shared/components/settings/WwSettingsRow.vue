<script setup lang="ts">
defineProps<{
  label: string
  subtitle?: string
  /** 长内容时使用上下布局，默认左右布局 */
  stacked?: boolean
}>()
</script>

<template>
  <div class="ww-settings-row" :class="{ 'ww-settings-row--stacked': stacked }">
    <div class="ww-settings-row__label" :class="{ 'is-centered': !subtitle }">
      <span class="ww-settings-row__title">{{ label }}</span>
      <span v-if="subtitle" class="ww-settings-row__subtitle">{{ subtitle }}</span>
    </div>
    <div v-if="$slots.default" class="ww-settings-row__control">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.ww-settings-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.ww-settings-row--stacked {
  flex-direction: column;
  align-items: stretch;
  gap: 0.5rem;
}

.ww-settings-row__label {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
}

.ww-settings-row__title {
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.35;
  color: var(--ww-ink);
}

.ww-settings-row__subtitle {
  margin-top: 0.125rem;
  font-size: 0.6875rem;
  line-height: 1.45;
  color: var(--ww-ink-faint);
}

.ww-settings-row__control {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
}

.ww-settings-row--stacked .ww-settings-row__control {
  flex: 1 1 auto;
  justify-content: stretch;
}
</style>
