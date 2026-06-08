<script setup lang="ts">
import Dialog from 'primevue/dialog'
import WwButton from '@shared/components/WwButton.vue'

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  reload: []
  overwrite: []
  saveAs: []
  dismiss: []
}>()

let closingByAction = false

function onSaveAs() {
  closingByAction = true
  emit('saveAs')
}

function onHide() {
  if (!closingByAction) emit('dismiss')
  closingByAction = false
}
</script>

<template>
  <Dialog
    v-model:visible="open"
    header="保存冲突"
    modal
    append-to="body"
    class="ww-glass-dialog w-[min(26rem,92vw)]"
    @hide="onHide"
    :pt="{
      root: { class: 'ww-glass-dialog-root' },
      header: { class: 'ww-glass-dialog__header' },
      content: { class: 'ww-glass-dialog__content' }
    }"
  >
    <p class="dg-conflict-msg">
      磁盘上的文件已被其他位置修改。你可以重新加载远程版本、覆盖保存，或另存为新文件。
    </p>
    <div class="dg-conflict-actions">
      <WwButton label="重新加载" severity="secondary" @click="emit('reload')" />
      <WwButton label="覆盖保存" severity="danger" @click="emit('overwrite')" />
      <WwButton label="另存为" @click="onSaveAs" />
    </div>
  </Dialog>
</template>
