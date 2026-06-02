<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import IconField from 'primevue/iconfield'
import InputText from 'primevue/inputtext'
import WwIcon from '@shared/components/WwIcon.vue'
import WwInputIcon from '@shared/components/WwInputIcon.vue'
import { useMusicSearch } from '@modules/music/composables/useMusicSearch'
import { useMusicPlatform } from '@modules/music/composables/useMusicPlatform'
import type { MusicHotSearchEntry } from '@shared/types/music'

const wrapRef = ref<HTMLElement | null>(null)
const inputRef = ref<InstanceType<typeof InputText> | null>(null)
const focused = ref(false)
const panelOpen = ref(false)
const search = useMusicSearch()
const { isPlatformPrimary } = useMusicPlatform()
const hotSearches = ref<MusicHotSearchEntry[]>([])
const defaultKeyword = ref('')

let blurTimer: ReturnType<typeof setTimeout> | null = null

function getInputEl(): HTMLInputElement | null {
  const cmp = inputRef.value as { $el?: HTMLElement } | null
  if (!cmp?.$el) return null
  return cmp.$el instanceof HTMLInputElement
    ? cmp.$el
    : cmp.$el.querySelector('input')
}

function focusInput(select = false) {
  const el = getInputEl()
  el?.focus()
  if (select) el?.select()
}

const showPanel = computed(
  () =>
    panelOpen.value &&
    focused.value &&
    !search.isActive &&
    (search.filteredHistory.length > 0 || hotSearches.value.length > 0)
)

const placeholder = computed(
  () =>
    defaultKeyword.value ||
    hotSearches.value[0]?.keyword ||
    '搜索歌曲、歌手、专辑、歌单'
)

watch(
  () => search.focusRequest,
  () => {
    void nextTick(() => {
      focusInput(true)
      panelOpen.value = true
    })
  }
)

function onFocus() {
  if (blurTimer) {
    clearTimeout(blurTimer)
    blurTimer = null
  }
  focused.value = true
  panelOpen.value = true
}

function onBlur() {
  focused.value = false
  blurTimer = setTimeout(() => {
    panelOpen.value = false
  }, 140)
}

function onSubmit() {
  void search.search()
  panelOpen.value = false
}

function onClear() {
  search.clearQuery()
  panelOpen.value = true
  focusInput()
}

function applyHistory(term: string) {
  search.query = term
  void search.search(term)
  panelOpen.value = false
}

function removeHistory(term: string, event: MouseEvent) {
  event.stopPropagation()
  search.removeHistory(term)
}

function clearAllHistory(event: MouseEvent) {
  event.stopPropagation()
  search.clearAllHistory()
}

function onDocMouseDown(event: MouseEvent) {
  const el = wrapRef.value
  if (!el || el.contains(event.target as Node)) return
  panelOpen.value = false
}

function loadSearchHints() {
  if (!isPlatformPrimary.value) {
    hotSearches.value = []
    defaultKeyword.value = ''
    return
  }
  void window.wanwu.music.searchHot(10).then((h) => {
    hotSearches.value = h
    if (!defaultKeyword.value && h[0]?.keyword) {
      defaultKeyword.value = h[0].keyword
    }
  })
  void window.wanwu.music.searchDefault().then((k) => {
    if (k?.trim()) defaultKeyword.value = k.trim()
  })
}

watch(isPlatformPrimary, () => loadSearchHints())

onMounted(() => {
  document.addEventListener('mousedown', onDocMouseDown)
  loadSearchHints()
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onDocMouseDown)
  if (blurTimer) clearTimeout(blurTimer)
})
</script>

<template>
  <div ref="wrapRef" class="ww-music-search-wrap">
    <div class="ww-music-search-field" :class="{ 'is-focused': focused || search.isActive }">
      <IconField class="ww-field-search ww-music-search">
        <WwInputIcon name="search" />
        <InputText
          ref="inputRef"
          v-model="search.query"
          type="text"
          class="ww-music-search__input"
          :placeholder="placeholder"
          autocomplete="off"
          spellcheck="false"
          @focus="onFocus"
          @blur="onBlur"
          @keydown.enter.prevent="onSubmit"
        />
      </IconField>
      <button
        v-if="search.query"
        type="button"
        class="ww-music-search__clear"
        aria-label="清除搜索"
        v-tooltip.bottom="'清除搜索'"
        @mousedown.prevent
        @click="onClear"
      >
        <WwIcon name="x" size="sm" />
      </button>
    </div>

    <Transition name="ww-music-search-panel">
      <div v-if="showPanel" class="ww-music-search-panel" @mousedown.prevent>
        <div v-if="hotSearches.length" class="ww-music-search-panel__hot">
          <span class="ww-music-search-panel__title">热搜榜</span>
          <ol class="ww-music-search-panel__hot-list">
            <li v-for="(h, i) in hotSearches" :key="h.keyword">
              <button type="button" class="ww-music-search-panel__hot-row" @click="applyHistory(h.keyword)">
                <span class="ww-music-search-panel__hot-rank" :class="{ 'is-top': i === 0 }">
                  <span v-if="i === 0" class="ww-music-search-panel__hot-flame" aria-hidden="true">🔥</span>
                  <span v-else>{{ i + 1 }}</span>
                </span>
                <span class="ww-music-search-panel__hot-keyword">{{ h.keyword }}</span>
              </button>
            </li>
          </ol>
        </div>
        <div v-if="search.filteredHistory.length" class="ww-music-search-panel__head">
          <span class="ww-music-search-panel__title">最近搜索</span>
          <button
            type="button"
            class="ww-music-search-panel__clear-all"
            aria-label="清空搜索历史"
            @click="clearAllHistory"
          >
            <WwIcon name="trash-2" size="xs" />
          </button>
        </div>
        <div class="ww-music-search-panel__history-scroll ww-scrollbar">
          <div class="ww-music-search-panel__history-flow" role="list">
            <div
              v-for="term in search.filteredHistory"
              :key="term"
              role="listitem"
              class="ww-music-search-panel__history-item"
            >
              <button type="button" class="ww-music-search-panel__chip" @click="applyHistory(term)">
                <WwIcon name="clock" size="xs" class="ww-music-search-panel__chip-icon" />
                <span class="ww-music-search-panel__chip-label">{{ term }}</span>
              </button>
              <button
                type="button"
                class="ww-music-search-panel__chip-remove"
                aria-label="删除此条搜索记录"
                @click="removeHistory(term, $event)"
              >
                <WwIcon name="x" size="xs" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
@import '@modules/library/core/styles/library-shared.css';

.ww-music-search-wrap {
  position: relative;
  width: min(100%, 15rem);
  min-width: 8.5rem;
  margin-left: auto;
  margin-right: 0.85rem;
  z-index: 25;
}

.ww-music-search-field {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  border-radius: var(--ww-music-input-radius);
  transition: box-shadow 0.18s var(--ww-ease-out);
}

.ww-music-search-field.is-focused {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ww-accent) 26%, transparent);
}

[data-theme='dark'] .ww-music-search-field.is-focused {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--ww-accent) 42%, transparent);
}

.ww-music-search {
  width: 100%;
}

.ww-music-search :deep(.p-inputtext) {
  width: 100%;
  height: 2.125rem;
  padding-block: 0;
  padding-right: 2.25rem;
  line-height: 2.125rem;
  font-size: 0.8125rem;
  border-radius: var(--ww-music-input-radius);
  box-shadow: none !important;
}

.ww-music-search-field.is-focused :deep(.p-inputtext:enabled:focus) {
  box-shadow: none !important;
}

.ww-music-search__clear {
  position: absolute;
  top: 50%;
  right: 0.45rem;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--ww-ink-muted);
  cursor: pointer;
  transition:
    color 0.18s var(--ww-ease-out),
    transform 0.15s var(--ww-ease-out);
}

.ww-music-search__clear:hover {
  color: var(--ww-ink);
  transform: translateY(-50%) scale(1.06);
}

.ww-music-search-panel {
  position: absolute;
  top: calc(100% + 0.35rem);
  right: 0;
  left: auto;
  z-index: 30;
  width: min(17rem, calc(100vw - 2rem));
  padding: 0.45rem 0.5rem 0.5rem;
  overflow: hidden;
  border-radius: var(--ww-music-panel-radius);
  border: 1px solid color-mix(in srgb, var(--ww-glass-border) 88%, transparent);
  background: color-mix(in srgb, var(--ww-glass-bg) 86%, transparent);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--ww-ink) 4%, transparent),
    0 10px 32px color-mix(in srgb, var(--ww-ink) 10%, transparent);
}

[data-theme='dark'] .ww-music-search-panel {
  background: color-mix(in srgb, var(--ww-glass-bg) 78%, rgb(0 0 0 / 0.22));
  border-color: color-mix(in srgb, var(--ww-border-subtle) 82%, transparent);
  box-shadow:
    0 1px 0 rgb(255 255 255 / 0.04),
    0 12px 36px rgb(0 0 0 / 0.36);
}

.ww-music-search-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.2rem 0.35rem 0.35rem;
}

.ww-music-search-panel__title {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ww-ink-faint);
}

.ww-music-search-panel__clear-all {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: var(--ww-radius-full);
  background: transparent;
  color: var(--ww-ink-faint);
  cursor: pointer;
  transition:
    color 0.18s var(--ww-ease-out),
    transform 0.15s var(--ww-ease-out);
}

.ww-music-search-panel__clear-all:hover {
  color: var(--ww-ink-muted);
  transform: scale(1.06);
}

.ww-music-search-panel__history-scroll {
  max-height: 9.5rem;
  overflow-y: auto;
  padding: 0 0.15rem 0.1rem;
  scrollbar-gutter: stable;
}

.ww-music-search-panel__history-flow {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem 0.5rem;
  align-items: center;
}

.ww-music-search-panel__history-item {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  height: 1.5rem;
  border-radius: 0.375rem;
  background: var(--ww-field-bg);
  overflow: hidden;
}

.ww-music-search-panel__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  max-width: 12rem;
  height: 100%;
  padding: 0 0 0 0.4375rem;
  border: none;
  background: transparent;
  font-size: 0.75rem;
  line-height: 1.25;
  cursor: pointer;
  color: var(--ww-ink);
}

.ww-music-search-panel__chip-icon {
  flex-shrink: 0;
  color: var(--ww-ink-faint);
  opacity: 0.85;
}

.ww-music-search-panel__chip-label {
  color: var(--ww-ink-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ww-music-search-panel__chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.35rem;
  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--ww-ink-faint);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.16s var(--ww-ease-out), color 0.16s var(--ww-ease-out);
}

.ww-music-search-panel__history-item:hover .ww-music-search-panel__chip-remove,
.ww-music-search-panel__chip-remove:focus-visible {
  opacity: 1;
}

.ww-music-search-panel__chip-remove:hover {
  color: var(--ww-ink);
}

.ww-music-search-panel__hot {
  padding: 0.15rem 0.35rem 0.55rem;
  border-bottom: 1px solid color-mix(in srgb, var(--ww-glass-border) 65%, transparent);
  margin-bottom: 0.35rem;
}

.ww-music-search-panel__hot-list {
  list-style: none;
  margin: 0.35rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.ww-music-search-panel__hot-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.45rem 0.4rem;
  border: none;
  border-radius: 0.5rem;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 0.16s var(--ww-ease-out);
}

.ww-music-search-panel__hot-row:hover {
  background: color-mix(in srgb, var(--ww-ink) 5%, transparent);
}

.ww-music-search-panel__hot-rank {
  flex-shrink: 0;
  width: 1.35rem;
  font-size: 0.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: center;
  color: var(--ww-ink-faint);
}

.ww-music-search-panel__hot-rank.is-top {
  color: #e85d04;
}

.ww-music-search-panel__hot-flame {
  font-size: 0.875rem;
  line-height: 1;
}

.ww-music-search-panel__hot-keyword {
  flex: 1;
  min-width: 0;
  font-size: 0.8125rem;
  line-height: 1.35;
  color: var(--ww-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ww-music-search-panel-enter-active,
.ww-music-search-panel-leave-active {
  transition:
    opacity 0.2s var(--ww-ease-out),
    transform 0.24s cubic-bezier(0.34, 1.08, 0.64, 1);
}

.ww-music-search-panel-enter-from,
.ww-music-search-panel-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}
</style>
