import type { Component } from 'vue'
import { isModuleId, type ModuleId } from '@app/config/modules'
import CloudAbodeView from '@modules/cloud-abode/CloudAbodeView.vue'
import LibraryView from '@modules/library/LibraryView.vue'
import PersonalView from '@modules/personal/PersonalView.vue'
import RssView from '@modules/rss/RssView.vue'
import SettingsView from '@modules/settings/SettingsView.vue'

const MODULE_VIEW: Record<ModuleId, Component> = {
  library: LibraryView,
  rss: RssView,
  'cloud-abode': CloudAbodeView,
  personal: PersonalView,
  settings: SettingsView
}

function moduleIdFromPath(path: string): ModuleId | undefined {
  const seg = path.replace(/^#/, '').split('/').filter(Boolean)[0]
  return seg && isModuleId(seg) ? seg : undefined
}

export function shellModuleFromReturnPath(returnPath: string | null | undefined): ModuleId {
  return moduleIdFromPath(returnPath ?? '') ?? 'library'
}

export function moduleViewComponent(id: ModuleId): Component {
  return MODULE_VIEW[id]
}
