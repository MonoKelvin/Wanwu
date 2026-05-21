<script setup lang="ts">
import { computed } from 'vue'
import Dialog from 'primevue/dialog'

const props = defineProps<{
  visible: boolean
  header?: string
  widthClass?: string
  /** 分享类弹窗：加强背景与面板模糊 */
  strongBlur?: boolean
  /** 仅遮罩变暗、不模糊页面（用于 Markdown 编辑确认等） */
  dimMask?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [v: boolean]
}>()

const maskClass = computed(() => {
  if (props.dimMask) return 'ww-glass-dialog-mask ww-glass-dialog-mask--dim'
  if (props.strongBlur) return 'ww-glass-dialog-mask ww-glass-dialog-mask--strong'
  return 'ww-glass-dialog-mask'
})
const rootClass = computed(() => {
  if (props.dimMask) return 'ww-glass-dialog-root ww-glass-dialog-root--dim'
  if (props.strongBlur) return 'ww-glass-dialog-root ww-glass-dialog-root--strong'
  return 'ww-glass-dialog-root'
})
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
      <div class="ww-dialog-footer">
        <slot name="footer" />
      </div>
    </template>
  </Dialog>
</template>
