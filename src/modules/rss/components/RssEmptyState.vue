<script setup lang="ts">
import EmptyState from '@app/components/EmptyState.vue'
import emptyRss from '@assets/icons/empty-rss.svg'

defineProps<{
  title: string
  description?: string
  compact?: boolean
}>()
</script>

<template>
  <EmptyState :title="title" :description="description" :compact="compact" :image="emptyRss" />
</template>
