<script setup lang="ts">
import Dialog from 'primevue/dialog'

defineProps<{
  visible: boolean
  header?: string
  widthClass?: string
}>()

const emit = defineEmits<{
  'update:visible': [v: boolean]
}>()
</script>

<template>
  <Dialog
    :visible="visible"
    :header="header"
    modal
    append-to="body"
    :class="['ww-glass-dialog', widthClass ?? 'w-[min(22rem,92vw)]']"
    :pt="{
      mask: { class: 'ww-glass-dialog-mask' },
      root: { class: 'ww-glass-dialog-root' },
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
