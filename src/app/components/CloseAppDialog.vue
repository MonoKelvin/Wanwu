<script setup lang="ts">
import Dialog from 'primevue/dialog'
import WwIcon from '@shared/components/WwIcon.vue'
import WwDialogFooterButton from '@shared/components/WwDialogFooterButton.vue'

const visible = defineModel<boolean>('visible', { default: false })

const emit = defineEmits<{
  tray: []
  quit: []
  cancel: []
}>()

function onHide() {
  emit('cancel')
}
</script>

<template>
  <Dialog
    v-model:visible="visible"
    header="关闭万物"
    modal
    append-to="body"
    :closable="true"
    class="ww-close-app-dialog w-[min(28rem,92vw)]"
    @hide="onHide"
  >
    <div class="ww-close-app-dialog__body">
      <WwIcon name="triangle-alert" size="lg" class="ww-close-app-dialog__icon" />
      <div class="ww-close-app-dialog__text">
        <p class="ww-close-app-dialog__message">要如何关闭窗口？</p>
        <p class="ww-close-app-dialog__detail">
          选择「最小化到托盘」可继续在后台运行；选择「退出万物」将结束程序。
        </p>
      </div>
    </div>
    <template #footer>
      <WwDialogFooterButton label="取消" cancel @click="emit('cancel')" />
      <WwDialogFooterButton label="最小化到托盘" @click="emit('tray')" />
      <WwDialogFooterButton label="退出万物" danger @click="emit('quit')" />
    </template>
  </Dialog>
</template>

<style scoped>
.ww-close-app-dialog__body {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.ww-close-app-dialog__icon {
  flex-shrink: 0;
  margin-top: 0.125rem;
  color: var(--ww-warn);
}

.ww-close-app-dialog__text {
  min-width: 0;
}

.ww-close-app-dialog__message {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.45;
  color: var(--ww-ink);
}

.ww-close-app-dialog__detail {
  margin: 0.375rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--ww-ink-muted);
}
</style>

<style>
.ww-close-app-dialog .p-dialog-footer .p-button .p-button-icon,
.ww-close-app-dialog .p-dialog-footer .p-button .ww-icon {
  display: none !important;
}

.ww-close-app-dialog .p-dialog-footer .p-button {
  gap: 0 !important;
}
</style>
