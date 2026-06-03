import { defineAsyncComponent, type Component } from 'vue'
import { CLOUD_ABODE_ENABLED, isModuleId, type ModuleId } from '@app/config/modules'
import { isItemDetailPath, moduleIdForItemDetailSource } from '@shared/utils/itemDetailRoute'

type ModuleLoader = () => Promise<{ default: Component }>

const MODULE_LOADERS: Partial<Record<ModuleId, ModuleLoader>> = {
  library: () => import('@modules/library/LibraryShellView.vue'),
  rss: () => import('@modules/rss/RssView.vue'),
  music: () => import('@modules/music/MusicView.vue'),
  personal: () => import('@modules/personal/PersonalView.vue'),
  settings: () => import('@modules/settings/SettingsView.vue')
}

if (CLOUD_ABODE_ENABLED) {
  MODULE_LOADERS['cloud-abode'] = () => import('@modules/cloud-abode/CloudAbodeView.vue')
}

const MODULE_VIEW = Object.fromEntries(
  Object.entries(MODULE_LOADERS).map(([id, loader]) => [
    id,
    defineAsyncComponent(() => loader!().then((m) => m.default))
  ])
) as Record<ModuleId, Component>

function moduleIdFromPath(path: string): ModuleId | undefined {
  const seg = path.replace(/^#/, '').split('/').filter(Boolean)[0]
  return seg && isModuleId(seg) ? seg : undefined
}

export function shellModuleFromReturnPath(returnPath: string | null | undefined): ModuleId {
  const path = returnPath ?? ''
  if (isItemDetailPath(path)) {
    const source = path.replace(/^#/, '').split('/')[2]
    return moduleIdForItemDetailSource(source) ?? 'library'
  }
  return moduleIdFromPath(path) ?? 'library'
}

export function moduleViewComponent(id: ModuleId): Component {
  if (id === 'cloud-abode' && !CLOUD_ABODE_ENABLED) {
    return MODULE_VIEW.library
  }
  return MODULE_VIEW[id] ?? MODULE_VIEW.library
}
