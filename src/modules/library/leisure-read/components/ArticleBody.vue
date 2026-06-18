<script setup lang="ts">
import { computed } from 'vue'
import { stripHtml } from '@modules/library/leisure-read/domain/types'

const props = defineProps<{
  html?: string
  plain: string
}>()

const displayText = computed(() => {
  if (props.html) return stripHtml(props.html)
  return props.plain
})
</script>

<template>
  <div class="lr-article">
    <p v-for="(para, i) in displayText.split(/\n\n+/)" :key="i" class="lr-article__para">
      {{ para }}
    </p>
  </div>
</template>

<style scoped>
.lr-article__para {
  margin: 0 0 0.75rem;
  line-height: 1.75;
  white-space: pre-wrap;
}

.lr-article__para:last-child {
  margin-bottom: 0;
}
</style>
