<script setup lang="ts">
import { computed } from 'vue'
import emptyGhost from '@assets/icons/empty-ghost.svg'
import emptyLibrary from '@assets/icons/empty-library.svg'
import emptyNotFound from '@assets/icons/empty-not-found.svg'
import emptyRss from '@assets/icons/empty-rss.svg'

const props = withDefaults(
  defineProps<{
    variant?: 'empty' | 'ghost' | 'rss' | 'not-found'
    title: string
    description?: string
    code?: string
    compact?: boolean
  }>(),
  { variant: 'empty', compact: false }
)

const EMPTY_ART: Record<typeof props.variant, string> = {
  empty: emptyLibrary,
  ghost: emptyGhost,
  rss: emptyRss,
  'not-found': emptyNotFound
}

const artSrc = computed(() => EMPTY_ART[props.variant])
</script>

<template>
  <div class="ww-empty-state" :class="{ 'ww-empty-state--compact': compact }" role="status">
    <div class="ww-empty-state__glow ww-empty-state__glow--a" aria-hidden="true" />
    <div class="ww-empty-state__glow ww-empty-state__glow--b" aria-hidden="true" />

    <div class="ww-empty-state__card">
      <div class="ww-empty-state__content">
        <p v-if="compact && code" class="ww-empty-state__code">{{ code }}</p>
        <div class="ww-empty-state__img" aria-hidden="true">
          <img class="ww-empty-state__art" :src="artSrc" alt="" />
        </div>
        <h3 class="ww-empty-state__title">{{ title }}</h3>
        <p v-if="description" class="ww-empty-state__desc">{{ description }}</p>
      </div>
      <div v-if="$slots.default" class="ww-empty-state__actions">
        <slot />
      </div>
    </div>
  </div>
</template>
<style>
/* 不显示 PrimeVue 默认空列表文案；保留带 .ww-empty-state 的自定义 #empty 插槽 */
.p-autocomplete-empty-message:not(:has(.ww-empty-state)) {
  display: none !important;
  padding: 0 !important;
  min-height: 0 !important;
}

.p-select-empty-message,
.p-listbox-empty-message,
.p-multiselect-empty-message {
  display: none !important;
}

.ww-empty-state {
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
  overflow: hidden;
}

.ww-empty-state::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(circle, var(--ww-grid-dot) 1px, transparent 1px);
  background-size: var(--ww-grid-size) var(--ww-grid-size);
  mask-image: radial-gradient(ellipse 72% 58% at 50% 48%, black 12%, transparent 78%);
  opacity: 0.55;
}

.ww-empty-state__glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(48px);
  pointer-events: none;
}

.ww-empty-state__glow--a {
  top: 10%;
  left: 18%;
  width: 180px;
  height: 180px;
  background: var(--ww-list-hover-bg);
}

.ww-empty-state__glow--b {
  right: 12%;
  bottom: 8%;
  width: 140px;
  height: 140px;
  background: var(--ww-inset);
}

.ww-empty-state__card {
  position: relative;
  z-index: 1;
  display: flex;
  box-sizing: border-box;
  width: 22rem;
  height: 19.5rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  text-align: center;
  background: var(--ww-glass-bg);
  border: 1px solid var(--ww-glass-border);
  border-radius: 1rem;
  box-shadow: none;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.ww-empty-state__content {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.ww-empty-state__code {
  flex: 0 0 auto;
  width: 100%;
  margin: 0 0 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  line-height: 1.125rem;
  color: var(--ww-ink-faint);
}

.ww-empty-state__img {
  flex: 0 0 187px;
  width: 187px;
  margin: 0;
  line-height: 0;
}

.ww-empty-state__art {
  display: block;
  width: 100%;
  height: auto;
  margin: 0 auto;
}

.ww-empty-state__title {
  flex: 0 0 auto;
  width: 100%;
  margin: -1rem 0 0;
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.375rem;
  color: var(--ww-ink);
}

.ww-empty-state__desc {
  flex: 0 0 auto;
  width: 100%;
  margin: 0.5rem 0 0;
  max-width: none;
  font-size: 0.875rem;
  line-height: 1.45;
  color: var(--ww-ink-faint);
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.ww-empty-state__actions {
  margin-top: 1.25rem;
}

/* 下拉内紧凑空状态（搜索无结果） */
.ww-empty-state--compact {
  flex: none;
  padding: 0.5rem 0.375rem 0.375rem;
}

.ww-empty-state--compact .ww-empty-state__glow {
  display: none;
}

.ww-empty-state--compact .ww-empty-state__card {
  width: 100%;
  height: auto;
  max-width: 100%;
  justify-content: center;
  padding: 0.75rem 0.625rem 0.625rem;
  background: transparent;
  border: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.ww-empty-state--compact .ww-empty-state__code {
  flex: none;
  margin-bottom: 0.25rem;
  font-size: 0.625rem;
  line-height: normal;
}

.ww-empty-state--compact .ww-empty-state__img {
  flex: none;
  width: 6.5rem;
  margin: 0 auto 0.5rem;
}

.ww-empty-state--compact .ww-empty-state__title {
  margin-top: 0;
  font-size: 0.8125rem;
  line-height: normal;
}

.ww-empty-state--compact .ww-empty-state__desc {
  flex: none;
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  line-height: 1.45;
  -webkit-line-clamp: unset;
}

.p-autocomplete-empty-message .ww-empty-state--compact {
  pointer-events: none;
}

.ww-empty-state__actions code {
  border-radius: 0.25rem;
  background: var(--ww-inset);
  padding: 0.125rem 0.375rem;
  font-size: 0.75rem;
  color: var(--ww-ink-muted);
}

[data-theme='dark'] .ww-empty-state__art {
  opacity: 0.88;
}
</style>
