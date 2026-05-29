<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import WwIcon from '@shared/components/WwIcon.vue'
import WwToastMessage from '@shared/components/WwToastMessage.vue'
import TitleBar from '@app/components/TitleBar.vue'
import AppShell from '@app/components/AppShell.vue'
import WwDismissibleConfirmHost from '@app/components/WwDismissibleConfirmHost.vue'
import WwPopTipHost from '@shared/components/WwPopTipHost.vue'
import { useSettingsStore } from '@shared/stores/settings'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import { useNotePopoutFocusSync } from '@modules/library/notes/lib/useNotePopoutFocusSync'
import { tryRestoreNotePopouts } from '@modules/library/notes/lib/useNotePopoutAutoRestore'

const route = useRoute()
const settingsStore = useSettingsStore()
const toast = useWanwuToast()
const isNotePopout = computed(() => Boolean(route.meta.notePopout))

useNotePopoutFocusSync()

function showLibraryNotice(text: string) {
  toast.info(text, '图鉴数据', { life: 12_000 })
}

onUnmounted(window.wanwu.app.onStartupNotice(showLibraryNotice))

onMounted(async () => {
  if (!settingsStore.loaded) await settingsStore.load()
  if (!isNotePopout.value && settingsStore.settings.notesPopoutRestore === 'on-startup') {
    await tryRestoreNotePopouts('on-startup')
  }
  for (const text of await window.wanwu.app.getStartupNotices()) {
    showLibraryNotice(text)
  }
})
</script>

<template>
  <div
    class="flex h-full flex-col overflow-hidden"
    :class="isNotePopout ? 'ww-note-popout-shell' : 'ww-app bg-ww-canvas'"
  >
    <Toast position="bottom-right" class="ww-toast-stack">
      <template #message="{ message }">
        <WwToastMessage :message="message" />
      </template>
    </Toast>
    <template v-if="isNotePopout">
      <WwPopTipHost />
      <RouterView class="min-h-0 flex-1" />
    </template>
    <template v-else>
      <ConfirmDialog class="ww-confirm-dialog">
        <template #message="slotProps">
          <div class="ww-confirm-dialog__message">
            <WwIcon name="triangle-alert" size="lg" class="ww-confirm-dialog__icon" />
            <span>{{ slotProps.message.message }}</span>
          </div>
        </template>
      </ConfirmDialog>
      <WwDismissibleConfirmHost />
      <WwPopTipHost />
      <TitleBar />
      <AppShell class="min-h-0 flex-1" />
    </template>
  </div>
</template>
<style>
/* 右下角 Toast：毛玻璃，仅图标区分类型 */

.p-toast.p-toast-bottom-right.ww-toast-stack {
  right: var(--ww-toast-inset) !important;
  bottom: var(--ww-toast-inset) !important;
  left: auto !important;
  top: auto !important;
  max-width: min(calc(100vw - 2 * var(--ww-toast-inset)), 22rem);
}

/* PrimeVue transition-group 包裹层：纵向堆叠 + 右对齐 */
.p-toast.p-toast-bottom-right.ww-toast-stack > div {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

/* 单条宽度：保证最小宽度，避免 fit-content 过窄 */
.p-toast.p-toast-bottom-right.ww-toast-stack .p-toast-message {
  display: block;
  width: max-content;
  min-width: var(--ww-toast-min-width, 14rem);
  max-width: var(--ww-toast-max-width, 22rem);
  margin: 0 !important;
}

.p-toast .p-toast-message,
.p-toast .p-toast-message-success,
.p-toast .p-toast-message-info,
.p-toast .p-toast-message-warn,
.p-toast .p-toast-message-error,
.p-toast .p-toast-message-secondary,
.p-toast .p-toast-message-contrast {
  border: 1px solid var(--ww-glass-border) !important;
  border-radius: 0.625rem !important;
  background: var(--ww-glass-bg) !important;
  backdrop-filter: blur(var(--ww-menu-blur));
  -webkit-backdrop-filter: blur(var(--ww-menu-blur));
  box-shadow: var(--ww-menu-shadow) !important;
  color: var(--ww-ink) !important;
}

.p-toast .p-toast-message-content {
  align-items: flex-start;
  gap: 0.5rem;
  width: 100%;
  min-width: var(--ww-toast-min-width, 14rem);
  min-height: 2.75rem;
  box-sizing: border-box;
  padding: 0.875rem 0.8125rem !important;
}

.p-toast .p-toast-close-button {
  flex-shrink: 0;
  align-self: flex-start;
  width: 1.5rem;
  height: 1.5rem;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 0.375rem;
  color: var(--ww-ink-faint) !important;
  background: transparent !important;
  box-shadow: none !important;
  transition: color var(--ww-duration-fast) var(--ww-ease-out);
}

.p-toast .p-toast-close-button:hover {
  color: var(--ww-ink-muted) !important;
  background: var(--ww-field-bg) !important;
}

.p-toast .p-toast-close-icon {
  width: 0.75rem;
  height: 0.75rem;
}

.ww-toast-item {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  width: 100%;
  min-width: var(--ww-toast-min-width, 14rem);
  box-sizing: border-box;
}

.ww-toast-item__icon {
  flex-shrink: 0;
  margin-top: 0.0625rem;
}

.ww-toast-item.is-success .ww-toast-item__icon {
  color: var(--ww-toast-success);
}

.ww-toast-item.is-error .ww-toast-item__icon {
  color: var(--ww-toast-error);
}

.ww-toast-item.is-info .ww-toast-item__icon {
  color: var(--ww-toast-info);
}

.ww-toast-item.is-warn .ww-toast-item__icon {
  color: var(--ww-toast-warn);
}

.ww-toast-item__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.ww-toast-item__text {
  min-width: 0;
}

.ww-toast-item__action {
  align-self: flex-start;
  margin: 0;
  padding: 0.1875rem 0;
  border: none;
  border-radius: 0;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.35;
  color: var(--ww-ink);
  text-decoration: underline;
  text-underline-offset: 0.15em;
  background: transparent;
  cursor: pointer;
  transition: color var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-toast-item__action:hover {
  color: var(--ww-accent-hover);
}

.ww-toast-item__title {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.35;
  color: var(--ww-ink);
}

.ww-toast-item__detail {
  margin: 0.1875rem 0 0;
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--ww-ink-muted);
}

.ww-toast-item__title:only-child,
.ww-toast-item__detail:first-child:last-child {
  margin-top: 0;
}

/* 顶部胶囊轻提示见 pop-tip.css + WwPopTipHost */

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
