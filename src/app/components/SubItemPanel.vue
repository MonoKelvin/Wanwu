<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import LibraryCategoryPanel from '@features/library/LibraryCategoryPanel.vue'
import RssSidebar from '@features/rss/RssSidebar.vue'

const route = useRoute()
const module = computed(() => route.meta.module as string)
</script>

<template>
  <aside class="ww-rss-panel flex w-[var(--ww-subpanel-width)] flex-col overflow-hidden" aria-label="分类">
    <header class="ww-chrome-safe px-3 pb-2">
      <h2 class="ww-section-label">{{ route.meta.title }}</h2>
    </header>

    <LibraryCategoryPanel v-show="module === 'library'" class="flex min-h-0 flex-1 flex-col" />

    <div v-show="module === 'rss'" class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <RssSidebar class="min-h-0 flex-1" />
    </div>
  </aside>
</template>

<style>
.ww-rss-panel {
  background: linear-gradient(180deg, var(--ww-panel) 0%, var(--ww-inset) 100%);
  border-right: 1px solid var(--ww-border-subtle);
  box-shadow: var(--ww-panel-edge-highlight);
}

.ww-section-label {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ww-ink-faint);
}
</style>
