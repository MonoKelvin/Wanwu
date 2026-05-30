<script setup lang="ts">
import { CA_UI_ASSETS } from '@modules/cloud-abode/shared/caUiAssets'

defineOptions({ name: 'CaVelvetyHero' })

defineProps<{
  kicker?: string
  title: string
  description?: string
  index?: string
}>()
</script>

<template>
  <section class="ww-ca-editorial-hero">
    <span class="ww-ca-editorial-hero__index" aria-hidden="true">{{ index ?? '01' }}</span>
    <img
      class="ww-ca-editorial-hero__arc"
      :src="CA_UI_ASSETS.arcSoft"
      alt=""
      aria-hidden="true"
    />
    <img
      class="ww-ca-editorial-hero__corner"
      :src="CA_UI_ASSETS.frameCorner"
      alt=""
      aria-hidden="true"
    />
    <div class="ww-ca-editorial-hero__content">
      <p v-if="kicker" class="ww-ca-kicker">{{ kicker }}</p>
      <h1 class="ww-ca-editorial-hero__title ww-ca-display">{{ title }}</h1>
      <p v-if="description" class="ww-ca-lead ww-ca-editorial-hero__lead">{{ description }}</p>
      <div v-if="$slots.actions" class="ww-ca-editorial-hero__actions">
        <slot name="actions" />
      </div>
    </div>
  </section>
</template>
