<script setup lang="ts">
/** 模块页：页头在滚动区外，滚动条仅出现在页头下方的内容区。 */
</script>

<template>
  <div class="ww-module-layout flex min-h-0 flex-1 flex-col overflow-hidden">
    <div v-if="$slots.header" class="ww-module-layout__header shrink-0">
      <slot name="header" />
    </div>
    <div class="ww-module-layout__body ww-scroll-main min-h-0 flex-1">
      <slot />
    </div>
  </div>
</template>
