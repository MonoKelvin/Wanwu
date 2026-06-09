<script setup lang="ts">
import Dialog from 'primevue/dialog'
import WwButton from '@shared/components/WwButton.vue'

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  save: []
  discard: []
  cancel: []
}>()
</script>

<template>
  <Dialog
    v-model:visible="open"
    header="未保存的更改"
    modal
    append-to="body"
    class="ww-glass-dialog w-[min(26rem,92vw)]"
    :pt="{
      root: { class: 'ww-glass-dialog-root' },
      header: { class: 'ww-glass-dialog__header' },
      content: { class: 'ww-glass-dialog__content' }
    }"
  >
    <p class="dg-conflict-msg">文档有未保存的更改。离开前可以保存、直接放弃，或留在此页继续编辑。</p>
    <div class="dg-conflict-actions">
      <WwButton label="留在此页" severity="secondary" text @click="emit('cancel')" />
      <WwButton label="不保存离开" severity="secondary" @click="emit('discard')" />
      <WwButton label="保存并离开" @click="emit('save')" />
    </div>
  </Dialog>
</template>
