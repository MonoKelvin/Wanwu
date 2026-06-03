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
<style>
.ww-module-layout {
  min-height: 0;
}

.ww-module-layout__header {
  background: var(--ww-inset);
}

.ww-module-layout__body {
  display: flex;
  flex-direction: column;
  padding: 0;
  background: var(--ww-inset);
}

.ww-module-layout__body > :not(.ww-personal__inner):not(.ww-empty-state) {
  padding: 0.75rem var(--ww-page-padding) var(--ww-page-padding);
}

/* 空状态：水平居中；垂直以中线为基准略偏上（全库「尚未选择分类」等） */
.ww-module-layout__body > .ww-empty-state {
  flex: 1;
  align-items: center;
  justify-content: center;
  min-height: 0;
  padding: 2rem var(--ww-page-padding);
  padding-bottom: clamp(3.5rem, 14vh, 8rem);
}

.ww-module-layout__body > .ww-empty-state .ww-empty-state__card {
  transform: translateY(calc(-1 * clamp(0.75rem, 5vh, 2.5rem)));
}
</style>
