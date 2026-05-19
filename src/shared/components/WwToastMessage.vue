<script setup lang="ts">
import { computed } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'
import type { WwIconName } from '@shared/icons/registry'

export type WanwuToastSeverity = 'success' | 'error' | 'info' | 'warn'

const props = defineProps<{
  message: {
    severity?: WanwuToastSeverity | string
    summary?: string
    detail?: string
  }
}>()

const iconMeta = computed((): { name: WwIconName; tone: string } => {
  switch (props.message.severity) {
    case 'error':
      return { name: 'circle-alert', tone: 'error' }
    case 'info':
      return { name: 'circle-help', tone: 'info' }
    case 'warn':
      return { name: 'triangle-alert', tone: 'warn' }
    default:
      return { name: 'check', tone: 'success' }
  }
})
</script>

<template>
  <div class="ww-toast-item" :class="`is-${iconMeta.tone}`">
    <WwIcon :name="iconMeta.name" size="md" class="ww-toast-item__icon" aria-hidden="true" />
    <div class="ww-toast-item__text">
      <p v-if="message.summary" class="ww-toast-item__title">{{ message.summary }}</p>
      <p v-if="message.detail" class="ww-toast-item__detail">{{ message.detail }}</p>
    </div>
  </div>
</template>
