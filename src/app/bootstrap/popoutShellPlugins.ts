import type { App } from 'vue'

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

/** 独立小窗（便笺、日签等）共用 PrimeVue 插件集 */
export async function installPopoutShellPlugins(app: App): Promise<void> {
  const [{ default: Tooltip }, { default: ToastService }] = await Promise.all([
    import('primevue/tooltip'),
    import('primevue/toastservice')
  ])
  await installPrimeVueCore(app)
  app.directive('tooltip', Tooltip)
  app.use(ToastService)
}
