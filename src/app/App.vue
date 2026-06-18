<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, shallowRef, watch, type Component } from 'vue'
import { useRoute } from 'vue-router'
import Toast from 'primevue/toast'
import WwIcon from '@shared/components/WwIcon.vue'
import WwToastMessage from '@shared/components/WwToastMessage.vue'
import TitleBar from '@app/components/TitleBar.vue'
import AppShell from '@app/components/AppShell.vue'
import WwPopTipHost from '@shared/components/WwPopTipHost.vue'
import { isItemDetailRoute } from '@shared/utils/itemDetailRoute'
import { useSettingsStore } from '@shared/stores/settings'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import { runMainAppStartupHooks, useMainAppIntegrations, getAppShellOverlayLoaders } from '@app/modules/mainAppRegistry'
import { useCloseAppDialog } from '@app/composables/useCloseAppDialog'
import {
  confirmDialogMounted,
  dismissibleConfirmMounted,
  runWhenIdle
} from '@app/bootstrap/overlayHosts'

const ConfirmDialog = defineAsyncComponent(() => import('primevue/confirmdialog'))
const WwDismissibleConfirmHost = defineAsyncComponent(
  () => import('@app/components/WwDismissibleConfirmHost.vue')
)
const CloseAppDialog = defineAsyncComponent(() => import('@app/components/CloseAppDialog.vue'))

const route = useRoute()
const settingsStore = useSettingsStore()
const toast = useWanwuToast()
const isFullscreenRoute = computed(
  () => Boolean(route.meta.fullscreen) && !isItemDetailRoute(route.name)
)

const {
  closeDialogVisible,
  onCloseTray,
  onCloseQuit,
  onCloseCancel
} = useCloseAppDialog()

const shellOverlays = shallowRef<Component[]>([])

const closeDialogMounted = ref(false)

watch(closeDialogVisible, (visible) => {
  if (visible) closeDialogMounted.value = true
})

useMainAppIntegrations()

function showLibraryNotice(text: string) {
  toast.info(text, '图鉴数据', { life: 12_000 })
}

let stopSettingsSync: (() => void) | null = null
let stopStartupNotice: (() => void) | null = null

onUnmounted(() => {
  stopSettingsSync?.()
  stopSettingsSync = null
  stopStartupNotice?.()
  stopStartupNotice = null
})

onMounted(async () => {
  const loaders = getAppShellOverlayLoaders()
  if (loaders.length > 0) {
    shellOverlays.value = await Promise.all(loaders.map((load) => load()))
  }

  if (window.wanwu?.app?.onAppSettingsChanged) {
    stopSettingsSync = window.wanwu.app.onAppSettingsChanged((remote) => {
      settingsStore.syncFromRemote(remote)
    })
  }
  if (window.wanwu?.app?.onStartupNotice) {
    stopStartupNotice = window.wanwu.app.onStartupNotice(showLibraryNotice)
  }

  if (!settingsStore.loaded) await settingsStore.load()

  runWhenIdle(() => {
    runMainAppStartupHooks({
      runWhenIdle,
      settings: settingsStore.settings
    })
    void (async () => {
      const notices = await window.wanwu?.app?.getStartupNotices?.()
      if (!notices) return
      for (const text of notices) {
        showLibraryNotice(text)
      }
    })()
    confirmDialogMounted.value = true
    dismissibleConfirmMounted.value = true
  })
})
</script>

<template>
  <div class="ww-app bg-ww-canvas flex h-full flex-col overflow-hidden">
    <Toast position="bottom-right" class="ww-toast-stack">
      <template #message="{ message }">
        <WwToastMessage :message="message" />
      </template>
    </Toast>
    <ConfirmDialog v-if="confirmDialogMounted" class="ww-confirm-dialog">
      <template #message="slotProps">
        <div class="ww-confirm-dialog__message">
          <WwIcon name="triangle-alert" size="lg" class="ww-confirm-dialog__icon" />
          <span>{{ slotProps.message.message }}</span>
        </div>
      </template>
    </ConfirmDialog>
    <WwDismissibleConfirmHost v-if="dismissibleConfirmMounted" />
    <WwPopTipHost />
    <TitleBar v-if="!isFullscreenRoute" />
    <AppShell class="min-h-0 flex-1" />
    <component v-for="(overlay, index) in shellOverlays" :key="index" :is="overlay" />
    <CloseAppDialog
      v-if="closeDialogMounted"
      v-model:visible="closeDialogVisible"
      @tray="onCloseTray"
      @quit="onCloseQuit"
      @cancel="onCloseCancel"
    />
  </div>
</template>

<style>
@import '@app/styles/toast-stack.css';

.fade-slide-enter-active {
  transition:
    opacity var(--ww-duration-slow) var(--ww-ease-out-slow),
    transform var(--ww-duration-slow) var(--ww-ease-out-slow);
}

.fade-slide-leave-active {
  transition:
    opacity var(--ww-duration-fast) var(--ww-ease-out),
    transform var(--ww-duration-fast) var(--ww-ease-out);
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.995);
}

.ww-confirm-dialog__message {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.ww-confirm-dialog__icon {
  flex-shrink: 0;
  color: var(--ww-warn);
}
</style>
