<script setup lang="ts">
import { computed } from 'vue'
import WwCoverImage from '@shared/components/WwCoverImage.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import type { FavoriteEntry } from '@shared/types/favorite'

const props = defineProps<{
  entry: FavoriteEntry
}>()

const emit = defineEmits<{
  open: []
  remove: []
}>()

const displayName = computed(() => props.entry.item?.name ?? '条目已不可用')
const available = computed(() => Boolean(props.entry.item))
const subLabel = computed(() => props.entry.item?.subCategoryName ?? null)
</script>

<template>
  <article class="ww-favorite-row" :class="{ 'ww-favorite-row--muted': !available }">
    <button
      type="button"
      class="ww-favorite-row__main"
      :disabled="!available"
      @click="emit('open')"
    >
      <div class="ww-favorite-row__thumb" aria-hidden="true">
        <WwCoverImage
          :src="entry.item?.coverPath"
          :alt="displayName"
          icon-size="sm"
          placeholder-text=""
        />
      </div>
      <div class="ww-favorite-row__text">
        <h3 class="ww-favorite-row__title">{{ displayName }}</h3>
        <p v-if="subLabel" class="ww-favorite-row__meta">{{ subLabel }}</p>
      </div>
      <WwIcon name="chevron-right" size="sm" class="ww-favorite-row__chevron" />
    </button>
    <button
      type="button"
      class="ww-favorite-row__remove"
      aria-label="取消收藏"
      @click.stop="emit('remove')"
    >
      <WwIcon name="x" size="sm" />
    </button>
  </article>
</template>
