<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  /** 标题与副标题同一行展示，过长省略 */
  inlineSubtitle?: boolean
  /** 标题与副标题上下排列、左对齐，完整显示 */
  stackedTitles?: boolean
}>()
</script>

<template>
  <header class="ww-page-header">
    <div class="ww-page-header__inner flex items-center justify-between gap-4">
      <div class="flex min-w-0 shrink-0 items-center gap-3">
        <slot name="leading" />
        <div
          class="min-w-0"
          :class="{
            'ww-page-header__titles-inline': inlineSubtitle,
            'ww-page-header__titles-stacked': stackedTitles
          }"
        >
          <h1>{{ title }}</h1>
          <p v-if="subtitle" class="ww-subtitle">{{ subtitle }}</p>
        </div>
      </div>
      <slot name="actions" />
    </div>
  </header>
</template>

<style>
.ww-page-header {
  flex-shrink: 0;
  padding: calc(var(--ww-titlebar-height) + 0.625rem) var(--ww-page-padding) 0.875rem;
  border-bottom: 1px solid var(--ww-border-subtle);
  box-shadow: none;
}

.ww-page-header h1 {
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--ww-ink);
}

.ww-page-header .ww-subtitle {
  margin-top: 0.1875rem;
  font-size: 0.8125rem;
  color: var(--ww-ink-muted);
}

.ww-page-header__titles-inline {
  display: flex;
  flex-wrap: nowrap;
  align-items: baseline;
  gap: 0.5rem;
  min-width: 0;
}

.ww-page-header__titles-inline h1 {
  flex-shrink: 0;
  margin: 0;
  white-space: nowrap;
}

.ww-page-header__titles-inline .ww-subtitle {
  flex: 1 1 auto;
  margin-top: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ww-page-header__titles-stacked {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.125rem;
  flex-shrink: 0;
  width: max-content;
  max-width: min(42vw, 20rem);
}

.ww-page-header__titles-stacked h1,
.ww-page-header__titles-stacked .ww-subtitle {
  margin: 0;
  width: 100%;
  text-align: left;
  white-space: normal;
  overflow: visible;
  text-overflow: unset;
  word-break: break-word;
}

.ww-page-header__titles-stacked .ww-subtitle {
  line-height: 1.35;
}
</style>
