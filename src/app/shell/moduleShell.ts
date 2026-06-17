import { defineAsyncComponent, type Component } from 'vue'
import { isModuleId, type ModuleId } from '@app/config/modules'
import { isModuleNavEnabled } from '@app/modules/moduleNavRegistry'
import { loadShellView } from '@app/modules/moduleRegistry'
import { isItemDetailPath, moduleIdForItemDetailSource } from '@shared/utils/itemDetailRoute'

const shellViewCache = new Map<ModuleId, Component>()

function getShellViewComponent(id: ModuleId): Component | undefined {
  if (shellViewCache.has(id)) return shellViewCache.get(id)
  const loader = loadShellView(id)
  if (!loader) return undefined
  const component = defineAsyncComponent(loader)
  shellViewCache.set(id, component)
  return component
}

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
  if (!isModuleNavEnabled(id)) {
    return getShellViewComponent('library') ?? emptyShellComponent()
  }
  return getShellViewComponent(id) ?? getShellViewComponent('library') ?? emptyShellComponent()
}

function emptyShellComponent(): Component {
  return defineAsyncComponent(() => Promise.resolve({ template: '<div class="h-full" />' }))
}
