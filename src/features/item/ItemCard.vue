<script setup lang="ts">
import UnsplashAttribution from '@features/item/UnsplashAttribution.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import type { Item } from '@shared/types/item'

const props = defineProps<{ item: Item; staggerIndex?: number }>()
defineEmits<{ click: [] }>()

const staggerStyle = () =>
  props.staggerIndex !== undefined ? { '--ww-stagger': props.staggerIndex } : undefined
</script>

<template>
  <article
    class="ww-product-card"
    role="button"
    tabindex="0"
    :style="staggerStyle()"
    @click="$emit('click')"
    @keydown.enter.prevent="$emit('click')"
    @keydown.space.prevent="$emit('click')"
  >
    <div class="ww-product-card__media">
      <img
        v-if="item.coverPath"
        :src="item.coverPath"
        :alt="item.name"
        class="ww-product-card__img"
        loading="lazy"
      />
      <div v-else class="ww-product-card__img ww-product-card__img--empty">
        <WwIcon name="image" size="md" />
      </div>
      <div class="ww-product-card__overlay" aria-hidden="true" />
      <span class="ww-product-card__peek ww-glass-chip" aria-hidden="true">
        <WwIcon name="chevron-right" :size="8" class="ww-product-card__peek-icon" />
        查看
      </span>
      <span v-if="item.subCategoryName" class="ww-product-card__badge ww-glass-chip">
        {{ item.subCategoryName }}
      </span>
      <UnsplashAttribution
        v-if="item.coverAttribution"
        class="ww-product-card__credit"
        :attribution="item.coverAttribution"
        compact
      />
    </div>

    <div class="ww-product-card__body">
      <h3 class="ww-product-card__title">{{ item.name }}</h3>
      <p v-if="item.summary" class="ww-product-card__summary">{{ item.summary }}</p>
    </div>
  </article>
</template>
