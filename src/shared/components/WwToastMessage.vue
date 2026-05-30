<script setup lang="ts">
import { computed } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'
import type { WwIconName } from '@shared/icons/registry'
import type { WanwuToastMessagePayload } from '@shared/types/toast'

const props = defineProps<{
  message: WanwuToastMessagePayload
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

async function onActionClick() {
  await props.message.onAction?.()
}
</script>

<template>
  <div class="ww-toast-item" :class="`is-${iconMeta.tone}`">
    <WwIcon :name="iconMeta.name" size="md" class="ww-toast-item__icon" aria-hidden="true" />
    <div class="ww-toast-item__body">
      <div class="ww-toast-item__text">
        <p v-if="message.summary" class="ww-toast-item__title">{{ message.summary }}</p>
        <p v-if="message.detail" class="ww-toast-item__detail">{{ message.detail }}</p>
      </div>
      <button
        v-if="message.actionLabel"
        type="button"
        class="ww-toast-item__action"
        @click.stop="onActionClick"
      >
        {{ message.actionLabel }}
      </button>
    </div>
  </div>
</template>
