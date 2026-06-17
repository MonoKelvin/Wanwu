import type { App } from 'vue'
import type { BootMode } from '@app/bootstrap/bootMode'
import { installPopoutShellPlugins } from '@app/bootstrap/popoutShellPlugins'
import { getBootModeContributor } from '@app/modules/bootModeRegistry'

async function installMainPlugins(app: App): Promise<void> {
  const { default: ConfirmationService } = await import('primevue/confirmationservice')
  await installPopoutShellPlugins(app)
  app.use(ConfirmationService)
}

/** 按窗口类型注册 UI 插件，避免托盘/小窗加载 PrimeVue */
export async function installUiPlugins(app: App, mode: BootMode): Promise<void> {
  if (mode === 'tray-menu' || mode === 'daily-widget') return

  if (mode === 'main') {
    await installMainPlugins(app)
    return
  }

  const contributor = getBootModeContributor(mode)
  if (contributor?.installUiPlugins) {
    await contributor.installUiPlugins(app)
  }
}
