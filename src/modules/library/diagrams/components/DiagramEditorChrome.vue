<script setup lang="ts">
import WwButton from '@shared/components/WwButton.vue'

defineProps<{
  title: string
  dirty?: boolean
}>()

const emit = defineEmits<{
  back: []
}>()
</script>

<template>
  <header class="dg-editor-chrome dg-float dg-float--top-left ww-glass-blur">
    <WwButton
      icon="arrow-left"
      severity="secondary"
      text
      rounded
      aria-label="返回"
      @click="emit('back')"
    />
    <span class="dg-editor-chrome__title">{{ title }}</span>
    <span v-if="dirty" class="dg-editor-chrome__badge">未保存</span>
  </header>
</template>
