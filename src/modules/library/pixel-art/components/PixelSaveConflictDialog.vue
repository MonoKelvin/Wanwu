<script setup lang="ts">
import WwDialogFooterButton from '@shared/components/WwDialogFooterButton.vue'
import WwGlassDialog from '@shared/components/WwGlassDialog.vue'

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
  <WwGlassDialog
    :visible="open"
    header="保存冲突"
    width-class="w-[min(26rem,92vw)]"
    dim-mask
    @update:visible="(v) => { open = v; if (!v) onHide() }"
  >
    <p class="pa-conflict-msg">
      磁盘上的文件已被其他位置修改。你可以重新加载远程版本、覆盖保存，或另存为新文件。
    </p>
    <template #footer>
      <div class="pa-conflict-footer">
        <WwDialogFooterButton label="重新加载" cancel @click="emit('reload')" />
        <WwDialogFooterButton label="覆盖保存" danger @click="emit('overwrite')" />
        <WwDialogFooterButton label="另存为" @click="onSaveAs" />
      </div>
    </template>
  </WwGlassDialog>
</template>

<style scoped>
.pa-conflict-msg {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--ww-ink-muted);
}

.pa-conflict-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.5rem;
  width: 100%;
}
</style>
