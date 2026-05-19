<script setup lang="ts">
import { computed } from 'vue'
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
</script>

<template>
  <article class="ww-fav-card" :class="{ 'ww-fav-card--muted': !available }">
    <button type="button" class="ww-fav-card__main" @click="emit('open')">
      <div class="ww-fav-card__media" aria-hidden="true">
        <img
          v-if="entry.item?.coverPath"
          :src="entry.item.coverPath"
          :alt="displayName"
          class="ww-fav-card__img"
          loading="lazy"
        />
        <span v-else class="ww-fav-card__empty">
          <WwIcon name="image" size="md" />
        </span>
      </div>
      <h3 class="ww-fav-card__title">{{ displayName }}</h3>
    </button>
    <button
      type="button"
      class="ww-fav-card__remove ww-glass-btn ww-glass-btn--icon"
      aria-label="取消收藏"
      @click.stop="emit('remove')"
    >
      <WwIcon name="x" size="sm" />
    </button>
  </article>
</template>
