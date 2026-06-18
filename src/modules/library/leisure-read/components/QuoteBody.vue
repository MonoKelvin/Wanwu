<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  body: string
  footer?: string
}>()

const authorLine = computed(() => {
  const footer = props.footer?.trim()
  if (!footer) return ''
  const parts = footer.split('·').map((p) => p.trim()).filter(Boolean)
  return parts.join(' · ')
})
</script>

<template>
  <blockquote class="lr-quote">
    <div class="lr-quote__row">
      <span class="lr-quote__mark" aria-hidden="true">“</span>
      <p class="lr-quote__text">{{ body }}</p>
    </div>
    <footer v-if="authorLine" class="lr-quote__author">—— {{ authorLine }}</footer>
  </blockquote>
</template>
