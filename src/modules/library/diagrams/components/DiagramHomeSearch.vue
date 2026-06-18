<script setup lang="ts">
import { computed } from 'vue'
import { useMinuteClock } from '@shared/composables/useMinuteClock'
import IconField from 'primevue/iconfield'
import InputText from 'primevue/inputtext'
import WwInputIcon from '@shared/components/WwInputIcon.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import WwIconButton from '@shared/components/WwIconButton.vue'
import type { DiagramSearchHit } from '@modules/library/diagrams/domain/types'
import { prepareDiagramSearchDisplay } from '@modules/library/diagrams/lib/diagramSearchText'
import { formatFileSize, formatRelativeTime } from '@modules/library/diagrams/lib/diagramHomeUtils'

const searchQuery = defineModel<string>('searchQuery', { required: true })

const props = defineProps<{
  hits: DiagramSearchHit[]
  loading?: boolean
  folderNameById?: (id: string) => string | undefined
}>()

const emit = defineEmits<{ select: [fileId: string] }>()

const nowTs = useMinuteClock()

const trimmedQuery = computed(() => searchQuery.value.trim())
const isActive = computed(() => Boolean(trimmedQuery.value))

const displayHits = computed(() =>
  props.hits.map((hit) => {
    const display = prepareDiagramSearchDisplay(hit.meta.title, null, trimmedQuery.value, {
      contentPreviewPlain: hit.contentPreview
    })
    return { hit, ...display }
  })
)

function clearSearch() {
  searchQuery.value = ''
}

function folderLabel(folderId: string) {
  return props.folderNameById?.(folderId) ?? folderId
}

defineExpose({ isActive })
</script>

<template>
  <div class="dg-home-search-wrap">
    <IconField class="dg-home-search">
      <WwInputIcon name="search" />
      <InputText
        v-model="searchQuery"
        placeholder="搜索流程图…"
        class="w-full"
        aria-label="搜索流程图"
      />
      <WwIconButton
        v-if="trimmedQuery"
        icon="x"
        icon-size="xs"
        class="dg-home-search__clear"
        ariaLabel="清除搜索"
        @click="clearSearch"
      />
    </IconField>

    <div v-if="isActive" class="dg-home-search-results">
      <p v-if="loading" class="dg-hint dg-home-search-results__status">搜索中…</p>
      <p v-else-if="!displayHits.length" class="dg-hint dg-home-search-results__status">
        未找到匹配的流程图
      </p>
      <ul v-else class="dg-home-search-results__list">
        <li v-for="row in displayHits" :key="row.hit.meta.id">
          <button type="button" class="dg-home-search-hit" @click="emit('select', row.hit.meta.id)">
            <span class="dg-home-search-hit__icon">
              <WwIcon name="layers" size="sm" />
            </span>
            <span class="dg-home-search-hit__body">
              <span class="dg-home-search-hit__title" v-html="row.titleHtml" />
              <span class="dg-home-search-hit__preview" v-html="row.previewHtml" />
              <span class="dg-home-search-hit__meta">
                {{ folderLabel(row.hit.meta.folderId) }} ·
                {{ formatFileSize(row.hit.meta.sizeBytes) }} ·
                {{ formatRelativeTime(row.hit.meta.updatedAt, nowTs) }}
              </span>
            </span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.dg-home-search__clear {
  position: absolute;
  right: 0.375rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--ww-ink-faint);
}

.dg-home-search__clear:hover {
  color: var(--ww-ink-muted);
}

.dg-home-search-hit__title :deep(.ww-notes-hit),
.dg-home-search-hit__preview :deep(.ww-notes-hit) {
  padding: 0 0.12em;
  border-radius: 0.2em;
  background: color-mix(in srgb, var(--ww-accent) 22%, transparent);
  color: var(--ww-ink);
}

[data-theme='dark'] .dg-home-search-hit__title :deep(.ww-notes-hit),
[data-theme='dark'] .dg-home-search-hit__preview :deep(.ww-notes-hit) {
  background: color-mix(in srgb, var(--ww-accent) 24%, transparent);
}
</style>
