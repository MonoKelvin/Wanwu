<script setup lang="ts">
import WwIcon from '@shared/components/WwIcon.vue'
import WwButton from '@shared/components/WwButton.vue'
import type { FavoriteEntry } from '@shared/types/favorite'

const props = defineProps<{
  entry: FavoriteEntry
}>()

const emit = defineEmits<{
  open: []
  remove: []
}>()

const displayName = () => props.entry.item?.name ?? '条目已不可用'
const isAvailable = () => Boolean(props.entry.item)
</script>

<template>
  <article
    class="ww-favorite-row"
    :class="{ 'ww-favorite-row--muted': !isAvailable() }"
  >
    <button
      type="button"
      class="ww-favorite-row__main"
      :disabled="!isAvailable()"
      @click="emit('open')"
    >
      <div class="ww-favorite-row__thumb" aria-hidden="true">
        <img
          v-if="entry.item?.coverPath"
          :src="entry.item.coverPath"
          :alt="displayName()"
          class="ww-favorite-row__img"
          loading="lazy"
        />
        <span v-else class="ww-favorite-row__thumb-empty">
          <WwIcon name="image" size="sm" />
        </span>
      </div>
      <div class="ww-favorite-row__text">
        <h3 class="ww-favorite-row__title">{{ displayName() }}</h3>
        <p class="ww-favorite-row__meta">
          <span v-if="entry.item?.subCategoryName">{{ entry.item.subCategoryName }}</span>
          <span v-else-if="entry.item">全库</span>
          <span v-else>无法打开</span>
        </p>
        <p v-if="entry.item?.summary || !isAvailable()" class="ww-favorite-row__summary">
          {{ entry.item?.summary ?? '可能已从全库移除' }}
        </p>
      </div>
      <WwIcon
        v-if="isAvailable()"
        name="chevron-right"
        size="sm"
        class="ww-favorite-row__chevron"
        aria-hidden="true"
      />
    </button>
    <WwButton
      icon="x"
      size="small"
      variant="text"
      severity="secondary"
      class="ww-favorite-row__remove"
      aria-label="取消收藏"
      @click.stop="emit('remove')"
    />
  </article>
</template>
