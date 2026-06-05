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
  <div class="ww-note-popout-shell">
    <Toast position="bottom-right" class="ww-toast-stack">
      <template #message="{ message }">
        <WwToastMessage :message="message" />
      </template>
    </Toast>
    <WwPopTipHost />
    <div class="ww-note-popout-shell__outlet">
      <RouterView />
    </div>
  </div>
</template>
