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
  /** 遮罩仅变暗；面板保留毛玻璃（快捷键等） */
  panelBlurOnly?: boolean
  /** 面板低透明度 + 高强模糊（仅面板，不模糊遮罩后景） */
  frostedPanel?: boolean
  /** 附加在对话框根节点上的类名 */
  dialogClass?: string
  /** 附加在遮罩上的类名（如快捷键轻遮罩） */
  maskClass?: string
  dismissableMask?: boolean
  closable?: boolean
  closeOnEscape?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [v: boolean]
}>()

const maskClass = computed(() => {
  const parts = ['ww-glass-dialog-mask']
  if (props.dimMask || props.panelBlurOnly) parts.push('ww-glass-dialog-mask--dim')
  else if (props.strongBlur) parts.push('ww-glass-dialog-mask--strong')
  if (props.maskClass) parts.push(props.maskClass)
  return parts.join(' ')
})
const rootClass = computed(() => {
  const parts = ['ww-glass-dialog-root']
  if (props.dimMask) parts.push('ww-glass-dialog-root--dim')
  else if (props.strongBlur) parts.push('ww-glass-dialog-root--strong')
  if (props.frostedPanel) parts.push('ww-glass-dialog-root--frosted')
  return parts.join(' ')
})
</script>

<template>
  <Dialog
    :visible="visible"
    :header="header"
    modal
    append-to="body"
    :dismissable-mask="dismissableMask"
    :closable="closable ?? true"
    :close-on-escape="closeOnEscape ?? true"
    :class="['ww-glass-dialog', widthClass ?? 'w-[min(22rem,92vw)]', dialogClass]"
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
