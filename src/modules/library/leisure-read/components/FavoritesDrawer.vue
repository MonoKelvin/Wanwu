<script setup lang="ts">
import type { LeisureReadFavorite } from '@modules/library/leisure-read/domain/types'
import { LEISURE_READ_TAB_LABELS } from '@modules/library/leisure-read/domain/settings'
import type { LeisureReadTabId } from '@modules/library/leisure-read/domain/types'

defineProps<{
  open: boolean
  favorites: LeisureReadFavorite[]
}>()

const emit = defineEmits<{
  close: []
  remove: [id: string]
}>()

function tabLabel(tab: LeisureReadTabId) {
  return LEISURE_READ_TAB_LABELS[tab]
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="lr-fav-overlay" @click.self="emit('close')">
      <aside class="lr-fav-drawer" role="dialog" aria-label="我的收藏">
        <header class="lr-fav-drawer__header">
          <h2>我的收藏</h2>
          <button type="button" class="lr-fav-drawer__close" @click="emit('close')">关闭</button>
        </header>
        <ul v-if="favorites.length" class="lr-fav-drawer__list">
          <li v-for="item in favorites" :key="item.id" class="lr-fav-drawer__item">
            <span class="lr-fav-drawer__tag">{{ tabLabel(item.tab) }}</span>
            <p class="lr-fav-drawer__title">{{ item.title || item.body.slice(0, 60) }}</p>
            <p v-if="item.subtitle" class="lr-fav-drawer__sub">{{ item.subtitle }}</p>
            <button type="button" class="lr-fav-drawer__remove" @click="emit('remove', item.id)">
              移除
            </button>
          </li>
        </ul>
        <p v-else class="lr-fav-drawer__empty">暂无收藏</p>
      </aside>
    </div>
  </Teleport>
</template>

<style scoped>
.lr-fav-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  justify-content: flex-end;
}

.lr-fav-drawer {
  width: min(24rem, 92vw);
  height: 100%;
  background: var(--ww-surface, #1a1a1a);
  border-left: 1px solid var(--ww-border-subtle, rgba(128, 128, 128, 0.2));
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.lr-fav-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.lr-fav-drawer__header h2 {
  margin: 0;
  font-size: 1rem;
}

.lr-fav-drawer__close,
.lr-fav-drawer__remove {
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--ww-accent, #6366f1);
}

.lr-fav-drawer__list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow: auto;
  flex: 1;
}

.lr-fav-drawer__item {
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--ww-border-subtle, rgba(128, 128, 128, 0.15));
}

.lr-fav-drawer__tag {
  font-size: 0.75rem;
  color: var(--ww-text-secondary);
}

.lr-fav-drawer__title {
  margin: 0.25rem 0;
  line-height: 1.5;
}

.lr-fav-drawer__sub {
  margin: 0;
  font-size: 0.875rem;
  color: var(--ww-text-secondary);
}

.lr-fav-drawer__empty {
  color: var(--ww-text-secondary);
}
</style>
