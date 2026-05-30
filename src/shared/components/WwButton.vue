<script setup lang="ts">
import Button from 'primevue/button'
import WwIcon from '@shared/components/WwIcon.vue'
import type { WwIconName } from '@shared/icons/registry'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    icon?: WwIconName
    iconSize?: 'xs' | 'sm' | 'md' | 'lg' | number
    label?: string
    loading?: boolean
  }>(),
  {
    iconSize: 'sm',
    loading: false
  }
)
</script>

<template>
  <Button v-bind="$attrs" :label="label" :loading="loading">
    <template v-if="icon && !loading" #icon>
      <WwIcon :name="icon" :size="iconSize" />
    </template>
    <slot />
  </Button>
</template>
