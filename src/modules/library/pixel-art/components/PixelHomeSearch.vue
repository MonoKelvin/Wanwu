<script setup lang="ts">
import { computed } from 'vue'
import { useMinuteClock } from '@shared/composables/useMinuteClock'
import IconField from 'primevue/iconfield'
import InputText from 'primevue/inputtext'
import WwInputIcon from '@shared/components/WwInputIcon.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import WwIconButton from '@shared/components/WwIconButton.vue'
import type { PixelSearchHit } from '@modules/library/pixel-art/domain/types'
import {
  formatPixelDimensions,
  formatRelativeTime,
  pixelTitleBase
} from '@modules/library/pixel-art/lib/pixelHomeUtils'

const searchQuery = defineModel<string>('searchQuery', { required: true })

const props = defineProps<{
  hits: PixelSearchHit[]
  loading?: boolean
}>()

const emit = defineEmits<{ select: [fileId: string] }>()

const nowTs = useMinuteClock()

const trimmedQuery = computed(() => searchQuery.value.trim())
const isActive = computed(() => Boolean(trimmedQuery.value))

function clearSearch() {
  searchQuery.value = ''
}

defineExpose({ isActive })
</script>

<template>
  <div class="pa-home-search-wrap">
    <IconField class="pa-home-search">
      <WwInputIcon name="search" />
      <InputText
        v-model="searchQuery"
        placeholder="搜索像素画…"
        class="w-full"
        aria-label="搜索像素画"
      />
      <WwIconButton
        v-if="trimmedQuery"
        icon="x"
        icon-size="xs"
        class="pa-home-search__clear"
        ariaLabel="清除搜索"
        @click="clearSearch"
      />
    </IconField>

    <div v-if="isActive" class="pa-home-search-results">
      <p v-if="loading" class="pa-hint pa-home-search-results__status">搜索中…</p>
      <p v-else-if="!hits.length" class="pa-hint pa-home-search-results__status">
        未找到匹配的像素画
      </p>
      <ul v-else class="pa-home-search-results__list">
        <li v-for="row in hits" :key="row.meta.id">
          <button type="button" class="pa-home-search-hit" @click="emit('select', row.meta.id)">
            <span class="pa-home-search-hit__icon">
              <WwIcon name="layout-grid" size="sm" />
            </span>
            <span class="pa-home-search-hit__body">
              <span class="pa-home-search-hit__title">{{ pixelTitleBase(row.meta.title) }}</span>
              <span class="pa-home-search-hit__meta">
                {{ formatPixelDimensions(row.meta) }} ·
                {{ formatRelativeTime(row.meta.updatedAt, nowTs) }}
              </span>
            </span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
