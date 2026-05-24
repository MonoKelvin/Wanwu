<script setup lang="ts">
import { ref } from 'vue'

const visible = ref(false)

function flash(): void {
  visible.value = true
  window.setTimeout(() => {
    visible.value = false
  }, 180)
}

defineExpose({ flash })
</script>

<template>
  <div
    v-show="visible"
    class="pointer-events-none fixed inset-0 z-[100] bg-white"
    aria-hidden="true"
  />
</template>
