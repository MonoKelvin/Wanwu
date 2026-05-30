<script setup lang="ts">
defineOptions({ inheritAttrs: false })
</script>

<template>
  <div class="ww-side-nav-panel" :class="$attrs.class">
    <slot />
  </div>
</template>

<style>
/* 侧栏面板容器 */
.ww-side-nav-panel {
  display: flex;
  min-height: 0;
  flex-direction: column;
  border: 1px solid var(--ww-border-subtle);
  border-radius: 0.75rem;
  background: var(--ww-elevated);
  padding: 0.375rem;
  box-shadow: none;
  transition: box-shadow var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-side-nav-panel:hover {
  box-shadow: var(--ww-shadow-card);
}
</style>
