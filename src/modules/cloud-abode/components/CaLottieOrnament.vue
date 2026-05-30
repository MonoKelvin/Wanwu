<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'
import { assetUrl } from '@shared/utils/assetUrl'

defineOptions({ name: 'CaLottieOrnament' })

const props = withDefaults(
  defineProps<{
    size?: number
  }>(),
  { size: 200 }
)

const enabled = ref(true)
const src = computed(() => {
  try {
    return assetUrl('seed/cloud-abode/ui/hero-ornament.json')
  } catch {
    return ''
  }
})

onMounted(() => {
  enabled.value = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
})
</script>

<template>
  <div
    class="ww-ca-lottie"
    :style="{ width: `${size}px`, height: `${size}px` }"
    aria-hidden="true"
  >
    <DotLottieVue
      v-if="enabled && src"
      :src="src"
      autoplay
      loop
      class="ww-ca-lottie__player"
    />
    <div v-else class="ww-ca-lottie__fallback" />
  </div>
</template>
