<script setup lang="ts">
import Tag from 'primevue/tag'
import WwIcon from '@shared/components/WwIcon.vue'
import type { Item } from '@shared/types/item'

defineProps<{ items: Item[] }>()
defineEmits<{ select: [id: string] }>()
</script>

<template>
  <ul class="ww-library-list" role="list">
    <li v-for="item in items" :key="item.id" role="listitem">
      <button type="button" class="ww-library-list__row" @click="$emit('select', item.id)">
        <div class="ww-library-list__main">
          <span class="ww-library-list__title">{{ item.name }}</span>
          <p v-if="item.summary" class="ww-library-list__summary">{{ item.summary }}</p>
          <div v-if="item.tags?.length" class="ww-library-list__tags">
            <Tag
              v-for="tag in item.tags.slice(0, 4)"
              :key="tag"
              :value="tag"
              severity="secondary"
              rounded
              class="ww-library-list__tag"
            />
          </div>
        </div>
        <WwIcon name="chevron-right" size="sm" class="ww-library-list__chevron" />
      </button>
    </li>
  </ul>
</template>
