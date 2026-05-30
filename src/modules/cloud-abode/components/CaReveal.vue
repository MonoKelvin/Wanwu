<script setup lang="ts">
import { ref } from 'vue'
import { useIntersectionObserver } from '@vueuse/core'

defineOptions({ name: 'CaReveal' })

const root = ref<HTMLElement | null>(null)
const visible = ref(false)

useIntersectionObserver(
  root,
  ([entry]) => {
    if (entry?.isIntersecting) visible.value = true
  },
  { threshold: 0.06, rootMargin: '0px 0px -4% 0px' }
)
</script>

<template>
  <div ref="root" class="ww-ca-reveal" :class="{ 'ww-ca-reveal--in': visible }">
    <slot />
  </div>
</template>
