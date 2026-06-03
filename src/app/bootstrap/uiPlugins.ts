import type { App } from 'vue'
import type { BootMode } from '@app/bootstrap/bootMode'

async function installPrimeVueCore(app: App): Promise<void> {
  const [{ default: PrimeVue }, { WanwuPreset }, { primeVueZhCn }] = await Promise.all([
    import('primevue/config'),
    import('@app/theme/preset'),
    import('@app/locale/primevue-zh-cn')
  ])
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
}

async function installNotePopoutPlugins(app: App): Promise<void> {
  const [{ default: Tooltip }, { default: ToastService }] = await Promise.all([
    import('primevue/tooltip'),
    import('primevue/toastservice')
  ])
  await installPrimeVueCore(app)
  app.directive('tooltip', Tooltip)
  app.use(ToastService)
}

async function installMainPlugins(app: App): Promise<void> {
  const { default: ConfirmationService } = await import('primevue/confirmationservice')
  await installNotePopoutPlugins(app)
  app.use(ConfirmationService)
}

/** 按窗口类型注册 UI 插件，避免托盘/小窗加载 PrimeVue */
export async function installUiPlugins(app: App, mode: BootMode): Promise<void> {
  switch (mode) {
    case 'tray-menu':
    case 'daily-widget':
      return
    case 'note-popout':
      await installNotePopoutPlugins(app)
      return
    case 'main':
      await installMainPlugins(app)
      return
  }
}
