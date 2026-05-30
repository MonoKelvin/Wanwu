<script setup lang="ts">
import WwButton from '@shared/components/WwButton.vue'
import type { WwIconName } from '@shared/icons/registry'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    label: string
    /** 取消 / 次要操作：描边次要按钮 */
    cancel?: boolean
    danger?: boolean
    icon?: WwIconName
    loading?: boolean
    disabled?: boolean
  }>(),
  {
    cancel: false,
    danger: false,
    loading: false,
    disabled: false
  }
)
</script>

<template>
  <WwButton
    v-bind="$attrs"
    :label="label"
    :icon="icon"
    :loading="loading"
    :disabled="disabled"
    :class="['ww-dialog-footer__btn', { 'ww-dialog-footer__btn--cancel': cancel }]"
    :severity="danger ? 'danger' : undefined"
    :text="cancel"
  />
</template>
