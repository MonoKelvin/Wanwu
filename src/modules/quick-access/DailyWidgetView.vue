<script setup lang="ts">
import { onMounted, ref } from 'vue'
import WwButton from '@shared/components/WwButton.vue'
import { useSettingsStore } from '@shared/stores/settings'
import type { DailyPickPreview } from '@shared/types/quickAccess'
import { toWanwuMediaUrl } from '@shared/utils/profileMedia'

const daily = ref<DailyPickPreview | null>(null)
const coverUrl = ref<string | null>(null)

onMounted(async () => {
  const settingsStore = useSettingsStore()
  if (!settingsStore.loaded) await settingsStore.load()
  daily.value = await window.wanwu.quickAccess.getDailyPick()
  coverUrl.value = toWanwuMediaUrl(daily.value?.coverPath ?? null)
})

async function openInMain() {
  await window.wanwu.quickAccess.openDailyInMain()
}

function closeWidget() {
  void window.wanwu.quickAccess.hideDailyWidget()
}
</script>

<template>
  <div class="ww-daily-widget">
    <header class="ww-daily-widget__head">
      <span class="ww-daily-widget__badge">今日一物</span>
      <button type="button" class="ww-daily-widget__close" aria-label="关闭" @click="closeWidget">×</button>
    </header>

    <div v-if="daily" class="ww-daily-widget__body">
      <div class="ww-daily-widget__cover-wrap">
        <img
          v-if="coverUrl"
          :src="coverUrl"
          :alt="daily.name"
          class="ww-daily-widget__cover"
          draggable="false"
        />
        <div v-else class="ww-daily-widget__cover ww-daily-widget__cover--empty" />
      </div>
      <p class="ww-daily-widget__category">{{ daily.categoryName }}</p>
      <h1 class="ww-daily-widget__title">{{ daily.name }}</h1>
      <p v-if="daily.summary" class="ww-daily-widget__summary">{{ daily.summary }}</p>
      <WwButton label="在万物中打开" size="small" class="ww-daily-widget__cta" @click="openInMain" />
    </div>

    <p v-else class="ww-daily-widget__loading">图鉴加载中…</p>
  </div>
</template>

<style scoped>
.ww-daily-widget {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 0.75rem;
  background: var(--ww-canvas);
  color: var(--ww-ink);
  -webkit-app-region: drag;
}

.ww-daily-widget__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  -webkit-app-region: drag;
}

.ww-daily-widget__badge {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ww-accent);
}

.ww-daily-widget__close {
  -webkit-app-region: no-drag;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 1.125rem;
  line-height: 1;
  color: var(--ww-ink-muted);
  background: transparent;
  cursor: pointer;
}

.ww-daily-widget__close:hover {
  background: var(--ww-list-hover-bg);
  color: var(--ww-ink);
}

.ww-daily-widget__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  -webkit-app-region: no-drag;
}

.ww-daily-widget__cover-wrap {
  flex: 1;
  min-height: 0;
  margin-bottom: 0.625rem;
  border-radius: 0.5rem;
  overflow: hidden;
  background: var(--ww-surface-raised);
}

.ww-daily-widget__cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.ww-daily-widget__cover--empty {
  min-height: 8rem;
}

.ww-daily-widget__category {
  margin: 0 0 0.25rem;
  font-size: 0.6875rem;
  color: var(--ww-ink-faint);
}

.ww-daily-widget__title {
  margin: 0 0 0.375rem;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.35;
}

.ww-daily-widget__summary {
  margin: 0 0 0.625rem;
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--ww-ink-muted);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ww-daily-widget__cta {
  align-self: stretch;
}

.ww-daily-widget__loading {
  margin: auto;
  font-size: 0.8125rem;
  color: var(--ww-ink-muted);
}
</style>
