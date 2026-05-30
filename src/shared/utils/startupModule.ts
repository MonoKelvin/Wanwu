import {
  CLOUD_ABODE_ENABLED,
  DEFAULT_MODULE_ID,
  isModuleId,
  modulePathById,
  type ModuleId
} from '@app/config/modules'
import type { AppSettings, StartupModule } from '@shared/types/settings'

function resolveEnabledModule(id: ModuleId): ModuleId {
  if (id === 'cloud-abode' && !CLOUD_ABODE_ENABLED) return DEFAULT_MODULE_ID
  return id
}

export function resolveStartupModule(settings: AppSettings): ModuleId {
  if (settings.startupModule === 'last') {
    const last = isModuleId(settings.lastActiveModule) ? settings.lastActiveModule : DEFAULT_MODULE_ID
    return resolveEnabledModule(last)
  }
  const startup = isModuleId(settings.startupModule) ? settings.startupModule : DEFAULT_MODULE_ID
  return resolveEnabledModule(startup)
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
