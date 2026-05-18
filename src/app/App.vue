<script setup lang="ts">
import { onMounted } from 'vue'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import TitleBar from '@app/components/TitleBar.vue'
import AppShell from '@app/components/AppShell.vue'
import { useSettingsStore } from '@shared/stores/settings'

const settingsStore = useSettingsStore()

onMounted(() => {
  settingsStore.load()
})
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden bg-ww-canvas">
    <Toast position="bottom-right" class="ww-toast-stack" />
    <ConfirmDialog class="ww-confirm-dialog" />
    <TitleBar />
    <AppShell class="min-h-0 flex-1" />
  </div>
</template>
