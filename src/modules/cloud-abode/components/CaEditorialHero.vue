<script setup lang="ts">
import CaLottieOrnament from '@modules/cloud-abode/components/CaLottieOrnament.vue'

defineOptions({ name: 'CaEditorialHero' })

defineProps<{
  kicker?: string
  title: string
  highlight?: string
  description?: string
}>()

defineEmits<{
  primary: []
  secondary: []
}>()
</script>

<template>
  <section class="ww-ca-editorial ww-glass-blur">
    <div class="ww-ca-editorial__copy">
      <p v-if="kicker" class="ww-ca-editorial__kicker">{{ kicker }}</p>
      <h2 class="ww-ca-editorial__title">
        {{ title }}
        <em v-if="highlight">{{ highlight }}</em>
      </h2>
      <p v-if="description" class="ww-ca-editorial__desc">{{ description }}</p>
      <div v-if="$slots.actions" class="ww-ca-editorial__actions">
        <slot name="actions" />
      </div>
    </div>
    <div class="ww-ca-editorial__ornament">
      <CaLottieOrnament :size="168" />
    </div>
  </section>
</template>
