<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import WwIcon from '@shared/components/WwIcon.vue'
import WwToastMessage from '@shared/components/WwToastMessage.vue'
import TitleBar from '@app/components/TitleBar.vue'
import AppShell from '@app/components/AppShell.vue'
import WwDismissibleConfirmHost from '@app/components/WwDismissibleConfirmHost.vue'
import { useSettingsStore } from '@shared/stores/settings'
import { useWanwuToast } from '@shared/composables/useWanwuToast'

const settingsStore = useSettingsStore()
const toast = useWanwuToast()

function showLibraryNotice(text: string) {
  toast.info(text, '图鉴数据', { life: 12_000 })
}

onUnmounted(window.wanwu.app.onStartupNotice(showLibraryNotice))

onMounted(async () => {
  if (!settingsStore.loaded) await settingsStore.load()
  for (const text of await window.wanwu.app.getStartupNotices()) {
    showLibraryNotice(text)
  }
})
</script>

<template>
  <div class="ww-app flex h-full flex-col overflow-hidden bg-ww-canvas">
    <Toast position="bottom-right" class="ww-toast-stack">
      <template #message="{ message }">
        <WwToastMessage :message="message" />
      </template>
    </Toast>
    <ConfirmDialog class="ww-confirm-dialog">
      <template #message="slotProps">
        <div class="ww-confirm-dialog__message">
          <WwIcon name="triangle-alert" size="lg" class="ww-confirm-dialog__icon" />
          <span>{{ slotProps.message.message }}</span>
        </div>
      </template>
    </ConfirmDialog>
    <WwDismissibleConfirmHost />
    <TitleBar />
    <AppShell class="min-h-0 flex-1" />
  </div>
</template>
