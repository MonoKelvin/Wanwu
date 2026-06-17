<script setup lang="ts">
import { inject } from 'vue'
import { PERSONAL_PAGE_KEY } from '@modules/personal/composables/personalPageContext'

const { backgroundUrl, backgroundStyle, hasBackground, bgEditorOpen } = inject(PERSONAL_PAGE_KEY)!
</script>

<template>
  <div
    v-if="backgroundUrl && backgroundStyle"
    class="ww-personal__bg"
    :style="backgroundStyle"
    aria-hidden="true"
  />
  <div
    v-if="!hasBackground && !bgEditorOpen"
    class="ww-personal__ambient"
    aria-hidden="true"
  >
    <span class="ww-personal__pattern" />
    <span class="ww-personal__ambient-glow ww-personal__ambient-glow--warm" />
  </div>
</template>
