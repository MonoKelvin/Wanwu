<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import IconField from 'primevue/iconfield'
import InputText from 'primevue/inputtext'
import WwContextMenu from '@shared/components/WwContextMenu.vue'
import WwInputIcon from '@shared/components/WwInputIcon.vue'
import type { NoteItem } from '@shared/types/notes'
import type { WwMenuItem } from '@shared/types/menu'
import {
  noteMatchesQuery,
  noteTitleForSearch,
  normalizeNotePlainText,
  prepareNoteSearchDisplay
} from '@modules/library/notes/lib/noteContentText'

const searchQuery = defineModel<string>('searchQuery', { required: true })

const props = withDefaults(
  defineProps<{
    notes: NoteItem[]
    selectedNoteId: string | null
    loading?: boolean
  }>(),
  {
    loading: false
  }
)

const emit = defineEmits<{
  select: [id: string]
  action: [
    payload: {
      action: 'toggle-pinned' | 'delete' | 'copy'
      noteId: string
    }
  ]
}>()
const menuRef = ref<InstanceType<typeof WwContextMenu> | null>(null)
const menuTargetNote = ref<NoteItem | null>(null)
const nowTs = ref(Date.now())
let minuteTicker: ReturnType<typeof setInterval> | null = null

const searchableNotes = computed(() =>
  props.notes.map((note) => ({
    note,
    title: noteTitleForSearch(note.title),
    content: normalizeNotePlainText(note.content).toLowerCase()
  }))
)

const noteOrderMap = computed(() => {
  const order = new Map<string, number>()
  props.notes.forEach((note, index) => {
    order.set(note.id, index)
  })
  return order
})

const sortedNotes = computed(() =>
  [...searchableNotes.value].sort((a, b) => {
    if (a.note.pinned !== b.note.pinned) return a.note.pinned ? -1 : 1
    if (a.note.pinned && b.note.pinned) {
      return (noteOrderMap.value.get(a.note.id) ?? 0) - (noteOrderMap.value.get(b.note.id) ?? 0)
    }
    return new Date(b.note.updatedAt).getTime() - new Date(a.note.updatedAt).getTime()
  })
)

const filteredNotes = computed(() => {
  const q = searchQuery.value.trim()
  let list = q
    ? sortedNotes.value
        .filter((entry) => noteMatchesQuery(entry.note.title, entry.note.content, q))
        .map((entry) => entry.note)
    : sortedNotes.value.map((entry) => entry.note)

  const selectedId = props.selectedNoteId
  if (selectedId && !list.some((note) => note.id === selectedId)) {
    const selected = props.notes.find((note) => note.id === selectedId)
    if (selected) list = [selected, ...list]
  }
  return list
})

const displayNotes = computed(() => {
  const q = searchQuery.value.trim()
  return filteredNotes.value.map((note) => {
    const search = prepareNoteSearchDisplay(displayTitle(note.title), note.content, q)
    return {
      note,
      titleHtml: search.titleHtml,
      previewHtml: search.previewHtml
    }
  })
})

const listMeta = computed(() => {
  const visible = filteredNotes.value.length
  const total = props.notes.length
  if (searchQuery.value.trim()) return `${visible} / ${total} 条`
  return `${total} 条便笺`
})

const emptyHint = computed(() => {
  if (props.loading) return ''
  if (props.notes.length === 0) return '还没有便笺'
  if (searchQuery.value.trim()) return '没有匹配的便笺'
  return '还没有便笺'
})

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Math.max(0, nowTs.value - then)
  if (diff < 30_000) return '刚刚'
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return '1 分钟内'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  const thenDate = new Date(then)
  const nowDate = new Date(nowTs.value)
  const dayDiff = Math.floor(
    (new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime() -
      new Date(thenDate.getFullYear(), thenDate.getMonth(), thenDate.getDate()).getTime()) /
      86_400_000
  )
  if (dayDiff <= 0) return `${hours} 小时前`
  if (dayDiff === 1) return '昨天'
  if (dayDiff === 2) return '前天'
  if (dayDiff < 7) return `${dayDiff} 天前`
  if (dayDiff < 30) return '一星期前'
  if (dayDiff < 365) return '一个月前'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function displayTitle(title: string): string {
  const t = title.trim()
  return t || '未命名便笺'
}

const menuItems = computed<WwMenuItem[]>(() => {
  const note = menuTargetNote.value
  if (!note) return []
  return [
    {
      label: note.pinned ? '取消置顶' : '置顶',
      wwIcon: note.pinned ? 'pin-off' : 'pin',
      class: note.pinned ? 'ww-notes-menu-item--pinned' : undefined,
      command: () => emit('action', { action: 'toggle-pinned', noteId: note.id })
    },
    {
      label: '复制内容',
      wwIcon: 'copy',
      command: () => emit('action', { action: 'copy', noteId: note.id })
    },
    { separator: true },
    {
      label: '删除',
      wwIcon: 'trash-2',
      command: () => emit('action', { action: 'delete', noteId: note.id })
    }
  ]
})

function onItemContextMenu(event: MouseEvent, note: NoteItem) {
  menuTargetNote.value = note
  void menuRef.value?.show(event)
}

onMounted(() => {
  minuteTicker = setInterval(() => {
    nowTs.value = Date.now()
  }, 60_000)
})

onBeforeUnmount(() => {
  if (minuteTicker) {
    clearInterval(minuteTicker)
    minuteTicker = null
  }
})
</script>

<template>
  <aside class="ww-notes-sidebar" aria-label="便笺列表">
    <div class="ww-notes-sidebar__head">
      <IconField class="ww-notes-search">
        <WwInputIcon name="search" />
        <InputText
          v-model="searchQuery"
          placeholder="搜索便笺…"
          class="w-full"
          aria-label="搜索便笺"
        />
      </IconField>
      <p class="ww-notes-sidebar__meta">{{ listMeta }}</p>
    </div>

    <div class="ww-notes-sidebar__body ww-scroll-main">
      <p v-if="loading" class="ww-notes-sidebar__hint">加载中…</p>

      <template v-else-if="displayNotes.length > 0">
        <button
          v-for="entry in displayNotes"
          :key="entry.note.id"
          type="button"
          class="ww-notes-item"
          :class="{
            'is-active': entry.note.id === selectedNoteId,
            [`is-${entry.note.color}`]: true,
            'is-pinned': entry.note.pinned
          }"
          @click="emit('select', entry.note.id)"
          @contextmenu.prevent="onItemContextMenu($event, entry.note)"
        >
          <span v-if="entry.note.pinned" class="ww-notes-item__flag" aria-hidden="true" />
          <span class="ww-notes-item__dot" aria-hidden="true" />
          <span class="ww-notes-item__main">
            <span class="ww-notes-item__title-row">
              <span class="ww-notes-item__title" v-html="entry.titleHtml" />
              <time class="ww-notes-item__time" :datetime="entry.note.updatedAt">
                {{ formatRelativeTime(entry.note.updatedAt) }}
              </time>
            </span>
            <span class="ww-notes-item__preview" v-html="entry.previewHtml" />
          </span>
        </button>
      </template>

      <p v-else class="ww-notes-sidebar__hint">{{ emptyHint }}</p>
    </div>
    <WwContextMenu ref="menuRef" :model="menuItems" />
  </aside>
</template>

<style scoped>
.ww-notes-sidebar {
  --ww-notes-item-pad-y: 0.5rem;
  --ww-notes-item-pad-x: 0.625rem;
  width: 100%;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-radius: 0.75rem;
  overflow: hidden;
}

.ww-notes-sidebar__head {
  flex-shrink: 0;
  padding: 0.625rem;
}

.ww-notes-sidebar__meta {
  margin: 0.5rem 0 0;
  font-size: 0.6875rem;
  color: var(--ww-ink-faint);
}

.ww-notes-search {
  width: 100%;
}

.ww-notes-search :deep(.p-inputtext) {
  width: 100%;
  font-size: 0.8125rem;
  min-height: 2rem;
  padding: 0.4375rem 0.625rem 0.4375rem 2.125rem;
}

.ww-notes-search :deep(.p-iconfield .p-inputicon) {
  inset-block: 0;
  display: flex;
  align-items: center;
  width: 2rem;
  font-size: 0.8125rem;
  color: var(--ww-ink-faint);
}

.ww-notes-sidebar__body {
  flex: 1;
  min-height: 0;
  padding: 0.625rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ww-notes-sidebar__hint {
  margin: 1rem 0.5rem;
  font-size: 0.75rem;
  color: var(--ww-ink-faint);
  text-align: center;
}

.ww-notes-item {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: stretch;
  column-gap: 0.5rem;
  row-gap: 0.25rem;
  width: 100%;
  height: 5.25rem;
  padding: var(--ww-notes-item-pad-y) var(--ww-notes-item-pad-x) var(--ww-notes-item-pad-y)
    calc(var(--ww-notes-item-pad-x) - 0.0625rem);
  border: 2px solid transparent;
  border-radius: 0.625rem;
  background: var(--ww-content);
  text-align: left;
  cursor: pointer;
  transition:
    background var(--ww-duration-fast) var(--ww-ease-out),
    border-color var(--ww-duration-fast) var(--ww-ease-out),
    box-shadow var(--ww-duration) var(--ww-ease-out),
    transform var(--ww-duration) var(--ww-ease-out);
  z-index: 0;
}

.ww-notes-item:hover {
  background: var(--ww-list-hover-bg);
  box-shadow: 0 12px 24px -14px rgb(18 18 22 / 0.22);
  transform: translateY(-1px);
  z-index: 2;
}

.ww-notes-item.is-active {
  background: color-mix(in oklab, var(--ww-content) 90%, var(--ww-notes-accent) 7%);
  border-color: color-mix(in oklab, var(--ww-notes-accent) 40%, transparent);
  box-shadow: 0 10px 24px -14px rgb(18 18 22 / 0.26);
}

.ww-notes-item.is-active:hover {
  box-shadow: 0 14px 28px -14px rgb(18 18 22 / 0.3);
}

.ww-notes-item.is-pinned {
  background: color-mix(in oklab, var(--ww-content) 88%, var(--ww-list-selected-bg));
  border: 2px solid color-mix(in oklab, var(--ww-notes-accent) 10%, transparent);
}

.ww-notes-item.is-pinned.is-active {
  background: color-mix(in oklab, var(--ww-content) 90%, var(--ww-notes-accent) 7%);
  border-color: color-mix(in oklab, var(--ww-notes-accent) 40%, transparent);
  box-shadow: 0 10px 24px -14px rgb(18 18 22 / 0.26);
}

.ww-notes-item.is-pinned.is-active:hover {
  box-shadow: 0 14px 28px -14px rgb(18 18 22 / 0.3);
}

.ww-notes-item__dot {
  width: 0.5625rem;
  height: 0.5625rem;
  margin-top: 0.375rem;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--ww-notes-accent, var(--ww-ink-faint));
  box-shadow:
    0 0.18rem 0.82rem color-mix(in oklab, var(--ww-notes-accent) 44%, transparent),
    0 0.08rem 0.24rem color-mix(in oklab, var(--ww-notes-accent) 34%, transparent);
}

.ww-notes-item.is-yellow {
  --ww-notes-accent: #d6a21e;
}
.ww-notes-item.is-green {
  --ww-notes-accent: #2f9b72;
}
.ww-notes-item.is-blue {
  --ww-notes-accent: #3f7ed8;
}
.ww-notes-item.is-pink {
  --ww-notes-accent: #d95f8f;
}
.ww-notes-item.is-purple {
  --ww-notes-accent: #7f63d9;
}
.ww-notes-item.is-gray {
  --ww-notes-accent: #7f8798;
}
.ww-notes-item.is-orange {
  --ww-notes-accent: #dd7b23;
}
.ww-notes-item.is-teal {
  --ww-notes-accent: #14918a;
}
.ww-notes-item.is-red {
  --ww-notes-accent: #d84f4a;
}

[data-theme='dark'] .ww-notes-item.is-yellow {
  --ww-notes-accent: #e3b236;
}
[data-theme='dark'] .ww-notes-item.is-green {
  --ww-notes-accent: #4ab68a;
}
[data-theme='dark'] .ww-notes-item.is-blue {
  --ww-notes-accent: #6ba2f0;
}
[data-theme='dark'] .ww-notes-item.is-pink {
  --ww-notes-accent: #ec84ae;
}
[data-theme='dark'] .ww-notes-item.is-purple {
  --ww-notes-accent: #a895ef;
}
[data-theme='dark'] .ww-notes-item.is-gray {
  --ww-notes-accent: #98a2b3;
}
[data-theme='dark'] .ww-notes-item.is-orange {
  --ww-notes-accent: #f2a04a;
}
[data-theme='dark'] .ww-notes-item.is-teal {
  --ww-notes-accent: #3bc3ba;
}
[data-theme='dark'] .ww-notes-item.is-red {
  --ww-notes-accent: #f58884;
}

:deep(.ww-notes-menu-item--pinned) {
  background: color-mix(in oklab, #8b7bf6 18%, var(--ww-content));
}

:deep(.ww-notes-menu-item--pinned .ww-icon) {
  color: #6d5ee6 !important;
}

.ww-notes-item__main {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 0.3125rem;
}

.ww-notes-item__title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  min-width: 0;
}

.ww-notes-item__title {
  flex: 1;
  min-width: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ww-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  overflow-wrap: anywhere;
}

.ww-notes-item__flag {
  position: absolute;
  top: 0.3125rem;
  right: 0.3125rem;
  width: 0.78rem;
  height: 0.78rem;
  background: color-mix(in oklab, var(--ww-ink-faint) 62%, var(--ww-content));
  -webkit-mask-image: url("@assets/icons/corner-flag-rounded.svg");
  mask-image: url("@assets/icons/corner-flag-rounded.svg");
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
}

.ww-notes-item.is-pinned .ww-notes-item__main,
.ww-notes-item.is-pinned .ww-notes-item__time {
  padding-top: 0;
}

.ww-notes-item__preview {
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--ww-ink-muted);
  display: -webkit-box;
  min-height: calc(1.35em * 1);
  max-height: calc(1.35em * 2);
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.ww-notes-item__preview :deep(.ww-notes-hit),
.ww-notes-item__title :deep(.ww-notes-hit),
.ww-notes-item :deep(.ww-notes-hit) {
  background: #ffe84f;
  color: #4b3a00;
  border-radius: 0.1875rem;
  padding: 0 0.06rem;
}

[data-theme='dark'] .ww-notes-item__preview :deep(.ww-notes-hit),
[data-theme='dark'] .ww-notes-item__title :deep(.ww-notes-hit),
[data-theme='dark'] .ww-notes-item :deep(.ww-notes-hit) {
  background: #c9a227;
  color: #1c1608;
}

.ww-notes-item__time {
  flex-shrink: 0;
  font-size: 0.6875rem;
  color: var(--ww-ink-faint);
  white-space: nowrap;
  margin-left: auto;
  padding-left: 0.25rem;
  padding-right: 0.625rem;
}

@media (prefers-reduced-motion: reduce) {
  .ww-notes-item {
    transition: none;
  }
}
</style>
