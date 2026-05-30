<script setup lang="ts">
import { CA_UI_ASSETS } from '@modules/cloud-abode/shared/caUiAssets'
import CaWebFooter from '@modules/cloud-abode/components/CaWebFooter.vue'

defineOptions({ name: 'CaPageLayout' })

withDefaults(
  defineProps<{
    wide?: boolean
  }>(),
  { wide: false }
)
</script>

<template>
  <div class="ww-ca-scroll">
    <div
      class="ww-ca-page"
      :class="{ 'ww-ca-page--wide': wide }"
    >
      <div
        class="ww-ca-page__pattern ww-ca-page__pattern--dots"
        aria-hidden="true"
        :style="{ backgroundImage: `url(${CA_UI_ASSETS.dots})` }"
      />
      <div class="ww-ca-page__inner">
        <slot />
        <CaWebFooter />
      </div>
    </div>
  </div>
</template>
