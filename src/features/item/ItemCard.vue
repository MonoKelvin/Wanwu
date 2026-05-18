<script setup lang="ts">
import Tag from 'primevue/tag'
import type { Item } from '@shared/types/item'

defineProps<{ item: Item }>()
defineEmits<{ click: [] }>()
</script>

<template>
  <article class="ww-item-card flex h-full cursor-pointer flex-col overflow-hidden rounded-lg" @click="$emit('click')">
    <div class="ww-item-media relative flex aspect-[4/3] items-center justify-center">
      <img
        v-if="item.coverPath"
        :src="item.coverPath"
        :alt="item.name"
        class="h-full w-full object-cover"
      />
      <i v-else class="pi pi-image text-2xl text-ww-ink-faint opacity-40" />
    </div>
    <div class="flex flex-1 flex-col gap-1 p-3">
      <h3 class="line-clamp-1 text-[0.8125rem] font-semibold text-ww-ink">{{ item.name }}</h3>
      <p v-if="item.summary" class="line-clamp-2 text-xs leading-relaxed text-ww-ink-muted">
        {{ item.summary }}
      </p>
      <div v-if="item.tags?.length" class="mt-auto flex flex-wrap gap-1 pt-1">
        <Tag
          v-for="tag in item.tags.slice(0, 2)"
          :key="tag"
          :value="tag"
          severity="secondary"
          rounded
          class="!text-[10px]"
        />
      </div>
    </div>
  </article>
</template>
