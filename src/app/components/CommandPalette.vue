<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import IconField from 'primevue/iconfield'
import WwIcon from '@shared/components/WwIcon.vue'
import WwInputIcon from '@shared/components/WwInputIcon.vue'
import { useWanwuConfirm } from '@shared/composables/useWanwuConfirm'
import type { WwIconName } from '@shared/icons/registry'
import type { QuickAccessHit, QuickAccessHitKind } from '@shared/types/quickAccess'
import { useQuickAccessTargets } from '@app/composables/useQuickAccessTargets'
import {
  clearCommandPaletteHistory,
  filterCommandPaletteHistory,
  loadCommandPaletteHistory,
  normalizePaletteTerm,
  pushCommandPaletteHistory,
  removeCommandPaletteHistory
} from '@app/lib/commandPaletteHistory'
import {
  mergePaletteHits,
  PALETTE_KIND_ORDER
} from '@app/lib/commandPaletteSearch'

const open = defineModel<boolean>('open', { default: false })

type PaletteRow =
  | { kind: 'history'; term: string }
  | { kind: 'hit'; hit: QuickAccessHit }

const query = ref('')
const hits = ref<QuickAccessHit[]>([])
const history = ref<string[]>([])
const loading = ref(false)
const activeIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

const confirm = useWanwuConfirm()
const { openTarget, hitToOpenTarget: toTarget } = useQuickAccessTargets()

let searchTimer: ReturnType<typeof setTimeout> | null = null
let searchGen = 0

const KIND_META: Record<
  QuickAccessHitKind,
  { label: string; wwIcon: WwIconName }
> = {
  library: { label: '图鉴', wwIcon: 'book-open' },
  note: { label: '便笺', wwIcon: 'pencil' },
  link: { label: '链接', wwIcon: 'link' },
  rss: { label: 'RSS', wwIcon: 'inbox' },
  music: { label: '音乐', wwIcon: 'disc-3' },
  favorite: { label: '收藏', wwIcon: 'heart' }
}

const trimmedQuery = computed(() => query.value.trim())
const hasQuery = computed(() => trimmedQuery.value.length > 0)

const visibleHistory = computed(() =>
  hasQuery.value
    ? filterCommandPaletteHistory(history.value, trimmedQuery.value)
    : history.value
)

const rows = computed((): PaletteRow[] => {
  const list: PaletteRow[] = visibleHistory.value.map((term) => ({ kind: 'history', term }))
  if (hasQuery.value) {
    for (const hit of hits.value) list.push({ kind: 'hit', hit })
  }
  return list
})

const showHistorySection = computed(() => visibleHistory.value.length > 0)
const showResultsSection = computed(() => hasQuery.value && (loading.value || hits.value.length > 0))
const showEmpty = computed(() => hasQuery.value && !loading.value && hits.value.length === 0)
const showHistoryEmpty = computed(() => !hasQuery.value && history.value.length === 0)

function refreshHistory() {
  history.value = loadCommandPaletteHistory()
}

function resetResults() {
  searchGen += 1
  hits.value = []
  activeIndex.value = 0
  loading.value = false
}

function resetState() {
  query.value = ''
  resetResults()
}

function close() {
  open.value = false
}

function clearQuery() {
  query.value = ''
  resetResults()
}

async function runSearch(q: string) {
  const gen = ++searchGen
  loading.value = true
  hits.value = []

  const tasks = PALETTE_KIND_ORDER.map(async (kind) => {
    try {
      const chunk = await window.wanwu.quickAccess.searchByKind({ kind, query: q })
      if (gen !== searchGen) return
      hits.value = mergePaletteHits(hits.value, chunk)
      syncActiveIndex()
    } catch {
      /* 单源失败不阻断其它源 */
    }
  })

  try {
    await Promise.allSettled(tasks)
  } finally {
    if (gen === searchGen) loading.value = false
  }
}

function syncActiveIndex() {
  const len = rows.value.length
  if (!len) {
    activeIndex.value = 0
    return
  }
  if (hasQuery.value && hits.value.length > 0 && activeIndex.value < visibleHistory.value.length) {
    activeIndex.value = visibleHistory.value.length
  }
  if (activeIndex.value >= len) activeIndex.value = 0
}

function scheduleSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  const q = trimmedQuery.value
  if (!q) {
    resetResults()
    syncActiveIndex()
    return
  }
  searchTimer = setTimeout(() => void runSearch(q), 160)
}

function recordSearchTerm(term: string) {
  const normalized = normalizePaletteTerm(term)
  if (!normalized) return
  history.value = pushCommandPaletteHistory(normalized)
}

async function applyHistoryTerm(term: string) {
  query.value = term
  await nextTick()
  await runSearch(term)
}

async function activateRow(row: PaletteRow | undefined) {
  if (!row) return
  if (row.kind === 'history') {
    await applyHistoryTerm(row.term)
    return
  }
  const term = trimmedQuery.value
  if (term) recordSearchTerm(term)
  await openTarget(toTarget(row.hit))
  close()
}

function removeHistoryTerm(term: string, event: Event) {
  event.preventDefault()
  event.stopPropagation()
  history.value = removeCommandPaletteHistory(term)
  syncActiveIndex()
}

async function clearAllHistory() {
  if (!history.value.length) return
  const ok = await confirm.ask({
    header: '清空搜索历史',
    message: '确定删除全部最近搜索记录？此操作不可撤销。',
    acceptLabel: '全部删除',
    rejectLabel: '取消',
    danger: true
  })
  if (!ok) return
  history.value = clearCommandPaletteHistory()
  syncActiveIndex()
}

function onKeydown(event: KeyboardEvent) {
  if (!open.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    if (hasQuery.value) {
      clearQuery()
      return
    }
    close()
    return
  }

  const len = rows.value.length
  if (!len) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % len
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = (activeIndex.value - 1 + len) % len
  } else if (event.key === 'Enter') {
    event.preventDefault()
    void activateRow(rows.value[activeIndex.value])
  }
}

function isRowActive(index: number): boolean {
  return rows.value.length > 0 && activeIndex.value === index
}

watch(open, async (visible) => {
  if (visible) {
    refreshHistory()
    await nextTick()
    inputRef.value?.focus()
    inputRef.value?.select()
    syncActiveIndex()
  } else {
    resetState()
  }
})

watch(query, () => {
  scheduleSearch()
  syncActiveIndex()
})

watch(rows, () => syncActiveIndex())

onMounted(() => {
  refreshHistory()
  window.addEventListener('keydown', onKeydown, true)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown, true)
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="ww-command-palette"
      role="presentation"
      @mousedown.self="close"
    >
      <div
        class="ww-command-palette__panel"
        role="dialog"
        aria-modal="true"
        aria-label="全局搜索"
        @mousedown.stop
      >
        <div class="ww-command-palette__head">
          <div class="ww-command-palette__search-wrap">
            <IconField class="ww-field-search ww-command-palette__field">
              <WwInputIcon name="search" />
              <input
                ref="inputRef"
                v-model="query"
                type="text"
                class="ww-command-palette__input"
                placeholder="搜索图鉴、便笺、链接、RSS、收藏…"
                autocomplete="off"
                spellcheck="false"
                aria-label="搜索关键词"
              />
            </IconField>
            <button
              v-if="hasQuery"
              type="button"
              class="ww-command-palette__clear"
              aria-label="清除搜索内容"
              @click="clearQuery"
            >
              <WwIcon name="x" size="xs" :stroke-width="1.25" />
            </button>
          </div>
          <kbd class="ww-command-palette__hint">Esc</kbd>
        </div>

        <div class="ww-command-palette__body">
          <section v-if="showHistorySection" class="ww-command-palette__section">
            <div class="ww-command-palette__section-head">
              <span class="ww-command-palette__section-title">最近搜索</span>
              <button
                type="button"
                class="ww-command-palette__clear-all"
                aria-label="清空全部搜索历史"
                @click="clearAllHistory"
              >
                <WwIcon name="trash-2" size="sm" />
              </button>
            </div>
            <div class="ww-command-palette__history-scroll">
              <div class="ww-command-palette__history-flow" role="list">
                <div
                  v-for="(term, index) in visibleHistory"
                  :key="term"
                  role="listitem"
                  class="ww-command-palette__history-item"
                  :class="{ 'is-active': isRowActive(index) }"
                >
                  <button
                    type="button"
                    class="ww-command-palette__chip"
                    @click="applyHistoryTerm(term)"
                    @mouseenter="activeIndex = index"
                  >
                    <WwIcon name="clock" size="xs" class="ww-command-palette__chip-icon" />
                    <span class="ww-command-palette__chip-label">{{ term }}</span>
                  </button>
                  <button
                    type="button"
                    class="ww-command-palette__chip-remove"
                    aria-label="删除此条搜索记录"
                    @click="removeHistoryTerm(term, $event)"
                  >
                    <WwIcon name="x" size="xs" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section v-if="showResultsSection" class="ww-command-palette__section">
            <p v-if="hasQuery && showHistorySection" class="ww-command-palette__section-title ww-command-palette__section-title--inline">
              搜索结果
            </p>
            <ul v-if="hits.length" class="ww-command-palette__list" role="listbox">
              <li
                v-for="(hit, hitIndex) in hits"
                :key="`${hit.kind}-${hit.id}`"
                role="option"
                :aria-selected="isRowActive(visibleHistory.length + hitIndex)"
              >
                <button
                  type="button"
                  class="ww-command-palette__item"
                  :class="{ 'is-active': isRowActive(visibleHistory.length + hitIndex) }"
                  @click="activateRow({ kind: 'hit', hit })"
                  @mouseenter="activeIndex = visibleHistory.length + hitIndex"
                >
                  <WwIcon :name="KIND_META[hit.kind].wwIcon" size="sm" class="ww-command-palette__item-icon" />
                  <span class="ww-command-palette__item-body">
                    <span class="ww-command-palette__item-title">{{ hit.title }}</span>
                    <span v-if="hit.subtitle" class="ww-command-palette__item-sub">{{ hit.subtitle }}</span>
                  </span>
                  <span class="ww-command-palette__item-kind">{{ KIND_META[hit.kind].label }}</span>
                </button>
              </li>
            </ul>
            <p v-else-if="loading" class="ww-command-palette__empty">
              {{ hits.length ? '继续搜索中…' : '搜索中…' }}
            </p>
          </section>

          <p v-if="showEmpty && !showHistorySection" class="ww-command-palette__empty">没有匹配结果</p>
          <p v-else-if="showHistoryEmpty" class="ww-command-palette__empty">输入关键词开始搜索</p>
        </div>

        <p class="ww-command-palette__foot">
          <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> 唤起 · ↑↓ 选择 · Enter 打开
        </p>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ww-command-palette {
  position: fixed;
  inset: 0;
  z-index: var(--ww-z-command-palette);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: min(12vh, 6rem) 1rem 1rem;
  background: rgb(0 0 0 / 0.35);
  backdrop-filter: blur(6px);
}

.ww-command-palette__panel {
  width: min(36rem, 100%);
  border: 1px solid var(--ww-glass-border);
  border-radius: 0.75rem;
  background: var(--ww-glass-bg);
  backdrop-filter: blur(var(--ww-menu-blur));
  box-shadow: var(--ww-menu-shadow);
  overflow: hidden;
}

.ww-command-palette__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0.875rem;
  border-bottom: 1px solid var(--ww-border-subtle);
}

.ww-command-palette__search-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
}

.ww-command-palette__field {
  width: 100%;
}

.ww-command-palette__field :deep(.p-inputicon) {
  width: 2.5rem;
  color: var(--ww-ink-faint);
  pointer-events: none;
}

.ww-command-palette__field :deep(.ww-icon) {
  stroke-width: 1.25;
  color: var(--ww-ink-faint);
}

.ww-command-palette__input {
  width: 100%;
  border: none;
  background: transparent;
  font-size: 0.9375rem;
  color: var(--ww-ink);
  outline: none;
  padding: 0.4375rem 2.125rem 0.4375rem 2.5rem;
}

.ww-command-palette__input::placeholder {
  color: var(--ww-ink-faint);
}

.ww-command-palette__clear {
  position: absolute;
  inset-block: 0;
  right: 0.125rem;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  padding: 0;
  border: none;
  border-radius: 0.25rem;
  color: var(--ww-ink-muted);
  background: transparent;
  cursor: pointer;
}

.ww-command-palette__clear:hover {
  color: var(--ww-ink);
  background: transparent;
}

.ww-command-palette__hint {
  flex-shrink: 0;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.6875rem;
  color: var(--ww-ink-faint);
  background: var(--ww-field-bg);
}

.ww-command-palette__body {
  padding: 0.375rem 0.5rem 0.25rem;
}

.ww-command-palette__section + .ww-command-palette__section {
  margin-top: 0.375rem;
  padding-top: 0.375rem;
  border-top: 1px solid var(--ww-border-subtle);
}

.ww-command-palette__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem 0.375rem;
}

.ww-command-palette__section-title {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--ww-ink-faint);
}

.ww-command-palette__section-title--inline {
  padding: 0.25rem 0.375rem 0.375rem;
}

.ww-command-palette__clear-all {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.625rem;
  height: 1.625rem;
  padding: 0;
  border: none;
  border-radius: 0.375rem;
  color: var(--ww-ink-faint);
  background: transparent;
  cursor: pointer;
}

.ww-command-palette__clear-all:hover {
  color: var(--ww-warn);
  background: var(--ww-list-hover-bg);
}

/* 约 5 行标签高度后滚动 */
.ww-command-palette__history-scroll {
  max-height: 9.5rem;
  overflow-y: auto;
  padding: 0 0.5rem 0.375rem;
}

.ww-command-palette__history-flow {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem 0.5rem;
  align-items: center;
  align-content: flex-start;
  justify-content: flex-start;
}

.ww-command-palette__history-item {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  max-width: 100%;
  height: 1.5rem;
  border-radius: 0.375rem;
  border: none;
  background: var(--ww-field-bg);
  overflow: hidden;
  vertical-align: middle;
}

.ww-command-palette__history-item.is-active {
  background: var(--ww-list-hover-bg);
}

.ww-command-palette__history-item.is-active .ww-command-palette__chip-label {
  color: var(--ww-ink-muted);
}

.ww-command-palette__chip {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 0.25rem;
  max-width: 12rem;
  height: 100%;
  padding: 0 0 0 0.4375rem;
  border: none;
  background: transparent;
  font-size: 0.75rem;
  line-height: 1.25;
  cursor: pointer;
}

.ww-command-palette__chip-icon {
  flex-shrink: 0;
  color: var(--ww-ink-faint);
  opacity: 0.85;
}

.ww-command-palette__chip-label {
  color: var(--ww-ink-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ww-command-palette__chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: stretch;
  width: 1.375rem;
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--ww-ink-faint);
  opacity: 0.75;
  cursor: pointer;
}

.ww-command-palette__chip-remove:hover {
  color: var(--ww-ink-muted);
  opacity: 1;
}

.ww-command-palette__list {
  margin: 0;
  padding: 0 0.25rem 0.375rem;
  max-height: min(40vh, 18rem);
  overflow-y: auto;
  list-style: none;
}

.ww-command-palette__item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  padding: 0.5rem 0.625rem;
  border: none;
  border-radius: 0.5rem;
  text-align: left;
  background: transparent;
  color: var(--ww-ink);
  cursor: pointer;
}

.ww-command-palette__item.is-active,
.ww-command-palette__item:hover {
  background: var(--ww-list-hover-bg);
}

.ww-command-palette__item-icon {
  flex-shrink: 0;
  color: var(--ww-ink-muted);
}

.ww-command-palette__item-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.ww-command-palette__item-title {
  font-size: 0.875rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ww-command-palette__item-sub {
  font-size: 0.75rem;
  color: var(--ww-ink-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ww-command-palette__item-kind {
  flex-shrink: 0;
  font-size: 0.6875rem;
  color: var(--ww-ink-faint);
}

.ww-command-palette__empty {
  margin: 0;
  padding: 1rem 0.75rem;
  font-size: 0.8125rem;
  color: var(--ww-ink-muted);
  text-align: center;
}

.ww-command-palette__foot {
  margin: 0;
  padding: 0.5rem 0.875rem 0.625rem;
  border-top: 1px solid var(--ww-border-subtle);
  font-size: 0.6875rem;
  color: var(--ww-ink-faint);
  text-align: center;
}

.ww-command-palette__foot kbd {
  padding: 0.0625rem 0.25rem;
  border-radius: 0.2rem;
  font-size: 0.625rem;
  background: var(--ww-field-bg);
}
</style>
