import {
  DEFAULT_MODULE_ID,
  isModuleId,
  modulePathById,
  type ModuleId
} from '@app/config/modules'
import type { AppSettings, StartupModule } from '@shared/types/settings'

export function resolveStartupModule(settings: AppSettings): ModuleId {
  if (settings.startupModule === 'last') {
    return isModuleId(settings.lastActiveModule) ? settings.lastActiveModule : DEFAULT_MODULE_ID
  }
  return isModuleId(settings.startupModule) ? settings.startupModule : DEFAULT_MODULE_ID
}

export function resolveStartupPath(settings: AppSettings): string {
  return modulePathById(resolveStartupModule(settings))
}

export function buildStartupModuleOptions(
  modules: ReadonlyArray<{ id: string; label: string }>
): Array<{ label: string; value: StartupModule }> {
  return [
    { label: '上次退出时所在模块', value: 'last' },
    ...modules.map((m) => ({ label: m.label, value: m.id as StartupModule }))
  ]
}
