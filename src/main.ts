import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'
import { WanwuPreset } from '@app/theme/preset'
import { primeVueZhCn } from '@app/locale/primevue-zh-cn'
import { applyColorScheme, readStoredColorScheme } from '@app/theme/applyTheme'
import { isNotePopoutHash } from '@app/utils/notePopoutEntry'
import '@app/styles/tokens.css'
import '@app/styles/theme-dark.css'
import '@app/styles/main.css'
import '@app/styles/form-fields.css'
import '@app/styles/scrollbars.css'
import '@app/styles/theme-components.css'
import App from '@app/App.vue'
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

async function bootstrap(): Promise<void> {
  const bootPopout = isNotePopoutHash()
  if (!bootPopout) {
    applyColorScheme(readStoredColorScheme() ?? 'system')
  }

  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.directive('tooltip', Tooltip)
  app.use(ToastService)
  app.use(ConfirmationService)
  app.use(PrimeVue, {
    ripple: false,
    locale: primeVueZhCn,
    theme: {
      preset: WanwuPreset,
      options: {
        darkModeSelector: '.p-dark',
        cssLayer: false
      }
    }
  })

  await router.isReady()
  if (bootPopout) {
    await syncThemeBeforePaint()
  }
  app.mount('#app')
}

void bootstrap()
