<script setup lang="ts">
import { computed } from 'vue'
import IconField from 'primevue/iconfield'
import InputText from 'primevue/inputtext'
import WwIcon from '@shared/components/WwIcon.vue'
import WwInputIcon from '@shared/components/WwInputIcon.vue'
import type { NoteItem } from '@shared/types/notes'

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
}>()

const sortedNotes = computed(() =>
  [...props.notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
)

const filteredNotes = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return sortedNotes.value
  return sortedNotes.value.filter(
    (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
  )
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
  const diff = Date.now() - then
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function notePreview(content: string, max = 56): string {
  const text = content.replace(/\s+/g, ' ').trim()
  if (!text) return '无正文'
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function displayTitle(title: string): string {
  const t = title.trim()
  return t || '未命名便笺'
}
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
    </div>

    <div class="ww-notes-sidebar__body ww-scroll-main">
      <p v-if="loading" class="ww-notes-sidebar__hint">加载中…</p>

      <template v-else-if="filteredNotes.length > 0">
        <button
          v-for="note in filteredNotes"
          :key="note.id"
          type="button"
          class="ww-notes-item"
          :class="{
            'is-active': note.id === selectedNoteId,
            [`is-${note.color}`]: true
          }"
          @click="emit('select', note.id)"
        >
          <span class="ww-notes-item__dot" aria-hidden="true" />
          <span class="ww-notes-item__main">
            <span class="ww-notes-item__title-row">
              <span class="ww-notes-item__title">{{ displayTitle(note.title) }}</span>
              <WwIcon
                v-if="note.pinned"
                class="ww-notes-item__pin"
                name="star"
                size="xs"
                aria-hidden="true"
              />
            </span>
            <span class="ww-notes-item__preview">{{ notePreview(note.content) }}</span>
          </span>
          <time class="ww-notes-item__time" :datetime="note.updatedAt">
            {{ formatRelativeTime(note.updatedAt) }}
          </time>
        </button>
      </template>

      <p v-else class="ww-notes-sidebar__hint">{{ emptyHint }}</p>
    </div>
  </aside>
</template>

<style scoped>
.ww-notes-sidebar {
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ww-border-subtle);
  border-radius: 0.75rem;
  background: var(--ww-panel);
  box-shadow: var(--ww-shadow-soft);
  overflow: hidden;
}

.ww-notes-sidebar__head {
  flex-shrink: 0;
  padding: 0.625rem;
  border-bottom: 1px solid var(--ww-border-subtle);
}

.ww-notes-search {
  width: 100%;
}

.ww-notes-search :deep(.p-inputtext) {
  width: 100%;
  font-size: 0.8125rem;
  padding: 0.4375rem 0.625rem 0.4375rem 1.75rem;
}

.ww-notes-search :deep(.p-iconfield .p-inputicon) {
  inset-block: 0;
  display: flex;
  align-items: center;
  width: 1.75rem;
  font-size: 0.8125rem;
  color: var(--ww-ink-faint);
}

.ww-notes-sidebar__body {
  flex: 1;
  min-height: 0;
  padding: 0.375rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.ww-notes-sidebar__hint {
  margin: 1rem 0.5rem;
  font-size: 0.75rem;
  color: var(--ww-ink-faint);
  text-align: center;
}

.ww-notes-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: start;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.5rem 0.5rem 0.4375rem;
  border: 1px solid transparent;
  border-radius: 0.625rem;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition:
    background var(--ww-duration-fast) var(--ww-ease-out),
    border-color var(--ww-duration-fast) var(--ww-ease-out),
    box-shadow var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-notes-item:hover {
  background: var(--ww-list-hover-bg);
}

.ww-notes-item.is-active {
  background: var(--ww-list-selected-bg);
  border-color: var(--ww-list-selected-ring);
  box-shadow: 0 0 0 1px var(--ww-list-hover-ring);
}

.ww-notes-item__dot {
  width: 0.4375rem;
  height: 0.4375rem;
  margin-top: 0.35rem;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--ww-notes-accent, var(--ww-ink-faint));
}

.ww-notes-item.is-yellow {
  --ww-notes-accent: #d4a72c;
}
.ww-notes-item.is-green {
  --ww-notes-accent: #3d9a6a;
}
.ww-notes-item.is-blue {
  --ww-notes-accent: #4a7eb8;
}
.ww-notes-item.is-pink {
  --ww-notes-accent: #c45c7a;
}
.ww-notes-item.is-purple {
  --ww-notes-accent: #7c6bc4;
}
.ww-notes-item.is-gray {
  --ww-notes-accent: var(--ww-ink-faint);
}

[data-theme='dark'] .ww-notes-item.is-yellow {
  --ww-notes-accent: #c9a227;
}
[data-theme='dark'] .ww-notes-item.is-green {
  --ww-notes-accent: #3d9a6a;
}
[data-theme='dark'] .ww-notes-item.is-blue {
  --ww-notes-accent: #5a8fc4;
}
[data-theme='dark'] .ww-notes-item.is-pink {
  --ww-notes-accent: #d07088;
}
[data-theme='dark'] .ww-notes-item.is-purple {
  --ww-notes-accent: #9a8ad4;
}

.ww-notes-item__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.ww-notes-item__title-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
}

.ww-notes-item__title {
  flex: 1;
  min-width: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ww-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ww-notes-item__pin {
  flex-shrink: 0;
  color: var(--ww-warn);
}

.ww-notes-item__preview {
  font-size: 0.6875rem;
  line-height: 1.4;
  color: var(--ww-ink-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ww-notes-item__time {
  flex-shrink: 0;
  margin-top: 0.125rem;
  font-size: 0.625rem;
  color: var(--ww-ink-faint);
  white-space: nowrap;
}
</style>
