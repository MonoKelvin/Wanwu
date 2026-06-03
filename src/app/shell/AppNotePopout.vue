<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import Toast from 'primevue/toast'
import WwToastMessage from '@shared/components/WwToastMessage.vue'
import WwPopTipHost from '@shared/components/WwPopTipHost.vue'
import { useSettingsStore } from '@shared/stores/settings'

const settingsStore = useSettingsStore()

let stopSettingsSync: (() => void) | null = null

onMounted(async () => {
  stopSettingsSync = window.wanwu.app.onAppSettingsChanged((remote) => {
    settingsStore.syncFromRemote(remote)
  })
  if (!settingsStore.loaded) await settingsStore.load()
})

onUnmounted(() => {
  stopSettingsSync?.()
  stopSettingsSync = null
})
</script>

<template>
  <div class="ww-note-popout-shell flex h-full flex-col overflow-hidden">
    <Toast position="bottom-right" class="ww-toast-stack">
      <template #message="{ message }">
        <WwToastMessage :message="message" />
      </template>
    </Toast>
    <WwPopTipHost />
    <RouterView class="min-h-0 flex-1" />
  </div>
</template>
