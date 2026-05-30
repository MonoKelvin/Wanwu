<script setup lang="ts">
defineOptions({ name: 'CaMeshWash' })

withDefaults(
  defineProps<{
    /** 用于 Hero / 横幅等局部区域 */
    variant?: 'hero' | 'banner' | 'subtle'
  }>(),
  { variant: 'subtle' }
)
</script>

<template>
  <div class="ww-ca-mesh-wash" :class="`ww-ca-mesh-wash--${variant}`" aria-hidden="true">
    <span class="ww-ca-mesh-wash__blob ww-ca-mesh-wash__blob--a" />
    <span class="ww-ca-mesh-wash__blob ww-ca-mesh-wash__blob--b" />
    <span class="ww-ca-mesh-wash__blob ww-ca-mesh-wash__blob--c" />
  </div>
</template>
