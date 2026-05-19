<script setup lang="ts">
import { computed } from 'vue'
import Dialog from 'primevue/dialog'

const props = defineProps<{
  visible: boolean
  header?: string
  widthClass?: string
  /** 分享类弹窗：加强背景与面板模糊 */
  strongBlur?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [v: boolean]
}>()

const maskClass = computed(() =>
  props.strongBlur ? 'ww-glass-dialog-mask ww-glass-dialog-mask--strong' : 'ww-glass-dialog-mask'
)
const rootClass = computed(() =>
  props.strongBlur ? 'ww-glass-dialog-root ww-glass-dialog-root--strong' : 'ww-glass-dialog-root'
)
</script>

<template>
  <Dialog
    :visible="visible"
    :header="header"
    modal
    append-to="body"
    :class="['ww-glass-dialog', widthClass ?? 'w-[min(22rem,92vw)]']"
    :pt="{
      mask: { class: maskClass },
      root: { class: rootClass },
      header: { class: 'ww-glass-dialog__header' },
      content: { class: 'ww-glass-dialog__content' },
      footer: { class: 'ww-glass-dialog__footer' }
    }"
    @update:visible="emit('update:visible', $event)"
  >
    <slot />
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </Dialog>
</template>
