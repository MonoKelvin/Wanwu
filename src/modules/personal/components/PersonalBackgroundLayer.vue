<script setup lang="ts">
import { inject } from 'vue'
import { PERSONAL_PAGE_KEY } from '@modules/personal/composables/personalPageContext'

const page = inject(PERSONAL_PAGE_KEY)!
</script>

<template>
  <div
    v-if="page.backgroundUrl && page.backgroundStyle"
    class="ww-personal__bg"
    :style="page.backgroundStyle"
    aria-hidden="true"
  />
  <div
    v-if="!page.hasBackground && !page.bgEditorOpen"
    class="ww-personal__ambient"
    aria-hidden="true"
  >
    <span class="ww-personal__pattern" />
    <span class="ww-personal__ambient-glow ww-personal__ambient-glow--warm" />
  </div>
</template>
