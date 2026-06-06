<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import IconField from 'primevue/iconfield'
import InputText from 'primevue/inputtext'
import WwInputIcon from '@shared/components/WwInputIcon.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import type { DiagramSearchHit } from '@shared/types/diagrams'
import { prepareDiagramSearchDisplay } from '@modules/library/diagrams/lib/diagramSearchText'
import { formatFileSize, formatRelativeTime } from '@modules/library/diagrams/lib/diagramHomeUtils'

const searchQuery = defineModel<string>('searchQuery', { required: true })

const props = defineProps<{
  hits: DiagramSearchHit[]
  loading?: boolean
  contentCache: Map<string, import('@shared/types/diagrams').DiagramContent | null>
}>()

const emit = defineEmits<{ select: [fileId: string] }>()

const nowTs = ref(Date.now())
let minuteTicker: ReturnType<typeof setInterval> | null = null

const trimmedQuery = computed(() => searchQuery.value.trim())
const isActive = computed(() => Boolean(trimmedQuery.value))

const displayHits = computed(() =>
  props.hits.map((hit) => {
    const content = props.contentCache.get(hit.meta.id) ?? null
    const display = prepareDiagramSearchDisplay(hit.meta.title, content, trimmedQuery.value)
    return { hit, ...display }
  })
)

onMounted(() => {
  minuteTicker = setInterval(() => {
    nowTs.value = Date.now()
  }, 60_000)
})

onBeforeUnmount(() => {
  if (minuteTicker) clearInterval(minuteTicker)
})

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
