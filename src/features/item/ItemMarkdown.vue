<script setup lang="ts">
/** @deprecated 请使用 `@shared/markdown` 的 `WwMarkdownReader` */
import WwMarkdownReader from '@shared/markdown/WwMarkdownReader.vue'
</script>

<template>
  <WwMarkdownReader v-bind="$attrs" />
</template>
