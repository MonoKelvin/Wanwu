<script setup lang="ts">
import Tag from 'primevue/tag'
import WwIcon from '@shared/components/WwIcon.vue'
import type { Item } from '@shared/types/item'

defineProps<{ items: Item[] }>()
defineEmits<{ select: [id: string] }>()
</script>

<template>
  <ul class="ww-library-list" role="list">
    <li v-for="item in items" :key="item.id" role="listitem">
      <button type="button" class="ww-library-list__row" @click="$emit('select', item.id)">
        <div class="ww-library-list__main">
          <span class="ww-library-list__title">{{ item.name }}</span>
          <p v-if="item.summary" class="ww-library-list__summary">{{ item.summary }}</p>
          <div v-if="item.tags?.length" class="ww-library-list__tags">
            <Tag
              v-for="tag in item.tags.slice(0, 4)"
              :key="tag"
              :value="tag"
              severity="secondary"
              rounded
              class="ww-library-list__tag"
            />
          </div>
        </div>
        <WwIcon name="chevron-right" size="sm" class="ww-library-list__chevron" />
      </button>
    </li>
  </ul>
</template>

<style>
.ww-library-list-meta {
  margin: 0 0 0.5rem;
  padding-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--ww-ink-muted);
}

.ww-library-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.ww-library-list__row {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.75rem;
  border: none;
  border-radius: 0.5rem;
  padding: 0.75rem 0.875rem;
  text-align: left;
  background: var(--ww-content);
  cursor: pointer;
  transition:
    background var(--ww-duration) var(--ww-ease-out),
    color var(--ww-duration) var(--ww-ease-out);
}

.ww-library-list__row:hover {
  background: var(--ww-list-hover-bg);
}

.ww-library-list__row:focus-visible {
  outline: 2px solid var(--ww-accent-soft);
  outline-offset: 1px;
  background: var(--ww-list-hover-bg);
}

.ww-library-list__row:active {
  background: var(--ww-list-selected-bg);
  transition-duration: var(--ww-duration-fast);
}

.ww-library-list li + li {
  margin-top: 0.5rem;
}

.ww-library-list__main {
  min-width: 0;
  flex: 1;
}

.ww-library-list__title {
  display: block;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--ww-ink);
}

.ww-library-list__summary {
  margin: 0.25rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--ww-ink-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ww-library-list__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.375rem;
}

.ww-library-list__tag.p-tag {
  padding: 0.1875rem 0.4375rem !important;
  font-size: 0.6875rem !important;
  font-weight: 500 !important;
  line-height: 1.25 !important;
  color: var(--ww-tag-fg) !important;
  background: var(--ww-tag-bg) !important;
  border: 1px solid var(--ww-tag-border) !important;
  box-shadow: none !important;
}

.ww-library-list__chevron {
  flex-shrink: 0;
  font-size: 0.75rem;
  color: var(--ww-ink-faint);
  transition: color var(--ww-duration) var(--ww-ease-out);
}

.ww-library-list__row:hover .ww-library-list__chevron {
  color: var(--ww-ink-muted);
  animation: ww-library-chevron-nudge 0.48s var(--ww-ease-out);
}

@keyframes ww-library-chevron-nudge {
  0%,
  100% {
    transform: translateX(0);
  }

  20% {
    transform: translateX(3px);
  }

  45% {
    transform: translateX(-1px);
  }

  70% {
    transform: translateX(2px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ww-library-list__row:hover .ww-library-list__chevron {
    animation: none;
  }
}
</style>
