<script setup lang="ts">
import Tag from 'primevue/tag'
import UnsplashAttribution from '@features/item/UnsplashAttribution.vue'
import type { Item } from '@shared/types/item'

defineProps<{ item: Item }>()
defineEmits<{ click: [] }>()

const specPreview = (item: Item) => {
  const entries = Object.entries(item.specs ?? {})
  return entries.slice(0, 2)
}
</script>

<template>
  <article class="ww-product-card" @click="$emit('click')">
    <div class="ww-product-card__media">
      <img
        v-if="item.coverPath"
        :src="item.coverPath"
        :alt="item.name"
        class="ww-product-card__img"
        loading="lazy"
      />
      <div v-else class="ww-product-card__img ww-product-card__img--empty">
        <i class="pi pi-image" aria-hidden="true" />
      </div>
      <span v-if="item.subCategoryName" class="ww-product-card__badge">{{ item.subCategoryName }}</span>
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

      <dl v-if="specPreview(item).length" class="ww-product-card__specs">
        <template v-for="[key, val] in specPreview(item)" :key="key">
          <dt>{{ key }}</dt>
          <dd>{{ val }}</dd>
        </template>
      </dl>

      <div v-if="item.tags?.length" class="ww-product-card__tags">
        <Tag
          v-for="tag in item.tags.slice(0, 3)"
          :key="tag"
          :value="tag"
          severity="secondary"
          rounded
          class="ww-product-card__tag"
        />
      </div>
    </div>
  </article>
</template>
