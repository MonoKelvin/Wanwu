<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import WwIcon from '@shared/components/WwIcon.vue'
import WwToastMessage from '@shared/components/WwToastMessage.vue'
import TitleBar from '@app/components/TitleBar.vue'
import AppShell from '@app/components/AppShell.vue'
import WwDismissibleConfirmHost from '@app/components/WwDismissibleConfirmHost.vue'
import { isModuleId } from '@app/config/modules'
import { useSettingsStore } from '@shared/stores/settings'
import { resolveStartupPath } from '@shared/utils/startupModule'

const settingsStore = useSettingsStore()
const router = useRouter()
const route = useRoute()

onMounted(async () => {
  await settingsStore.load()
  if (route.path === '/' || route.path === '') {
    await router.replace(resolveStartupPath(settingsStore.settings))
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
