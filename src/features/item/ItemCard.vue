<script setup lang="ts">
import type { Item } from '@shared/types/item'

defineProps<{ item: Item }>()
defineEmits<{ click: [] }>()
</script>

<template>
  <article
    class="group cursor-pointer border border-ww-border bg-ww-bg transition-colors duration-ww hover:bg-ww-bg-subtle"
    @click="$emit('click')"
  >
    <div class="aspect-[4/3] bg-ww-bg-subtle">
      <div
        v-if="!item.coverPath"
        class="flex h-full items-center justify-center text-3xl text-ww-muted opacity-30"
      >
        <i class="pi pi-image" />
      </div>
    </div>
    <div class="p-3">
      <h3 class="truncate text-sm font-medium">{{ item.name }}</h3>
      <p v-if="item.summary" class="mt-1 line-clamp-2 text-xs text-ww-muted">{{ item.summary }}</p>
    </div>
  </article>
</template>
