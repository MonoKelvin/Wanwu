<script setup lang="ts">
import { onMounted } from 'vue'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import WwIcon from '@shared/components/WwIcon.vue'
import TitleBar from '@app/components/TitleBar.vue'
import AppShell from '@app/components/AppShell.vue'
import { useSettingsStore } from '@shared/stores/settings'

const settingsStore = useSettingsStore()

onMounted(() => {
  settingsStore.load()
})
</script>

<template>
  <div class="ww-app flex h-full flex-col overflow-hidden bg-ww-canvas">
    <Toast position="bottom-right" class="ww-toast-stack" />
    <ConfirmDialog class="ww-confirm-dialog">
      <template #message="slotProps">
        <div class="ww-confirm-dialog__message">
          <WwIcon name="triangle-alert" size="lg" class="ww-confirm-dialog__icon" />
          <span>{{ slotProps.message.message }}</span>
        </div>
      </template>
    </ConfirmDialog>
    <TitleBar />
    <AppShell class="min-h-0 flex-1" />
  </div>
</template>
