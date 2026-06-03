import { createApp, type Component } from 'vue'
import { createPinia } from 'pinia'
import { applyColorScheme, readStoredColorScheme } from '@app/theme/applyTheme'
import { detectBootMode, isPopoutBootMode, type BootMode } from '@app/bootstrap/bootMode'
import { loadStylesForMode } from '@app/bootstrap/loadStyles'
import { loadWebFonts } from '@app/bootstrap/loadWebFonts'
import { installUiPlugins } from '@app/bootstrap/uiPlugins'
import router from '@app/router'

async function syncThemeBeforePaint(): Promise<void> {
  const fallback = readStoredColorScheme() ?? 'system'
  try {
    const remote = await window.wanwu.app.getSettings()
    applyColorScheme(remote.colorScheme ?? fallback)
    const root = document.documentElement
    root.dataset.navAlign = remote.navAlign
    root.dataset.navDisplay = remote.navDisplay
  } catch {
    applyColorScheme(fallback)
  }
}

async function resolveRootComponent(mode: BootMode): Promise<Component> {
  switch (mode) {
    case 'tray-menu':
      return (await import('@app/shell/AppTray.vue')).default
    case 'daily-widget':
      return (await import('@app/shell/AppDailyWidget.vue')).default
    case 'note-popout':
      return (await import('@app/shell/AppNotePopout.vue')).default
    default:
      return (await import('@app/App.vue')).default
  }
}

async function bootstrap(): Promise<void> {
  const mode = detectBootMode()

  if (mode === 'tray-menu') {
    document.documentElement.classList.add('ww-tray-menu-root')
  }

  await loadStylesForMode(mode)
  loadWebFonts(mode)
  if (mode === 'main') {
    await import('@app/styles/toast-stack.css')
  } else if (mode === 'note-popout') {
    await import('@app/styles/toast-stack.css')
  }

  if (!isPopoutBootMode(mode)) {
    applyColorScheme(readStoredColorScheme() ?? 'system')
  }

  const app = createApp(await resolveRootComponent(mode))
  app.use(createPinia())
  app.use(router)
  await installUiPlugins(app, mode)

  await router.isReady()
  if (isPopoutBootMode(mode)) {
    await syncThemeBeforePaint()
  }
  app.mount('#app')
}

void bootstrap()
