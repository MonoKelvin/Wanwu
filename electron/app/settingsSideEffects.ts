import type { AppSettings } from '../../src/shared/types/settings'
import type { AppServices } from '../ipc/types'
import { getMainProcessModules } from '../../src/shared/module-bridge/mainProcessRegistry'
import { createMainProcessContext } from './mainProcessContext'

/** 设置变更后通知各模块（框架编排，不含业务逻辑） */
export function dispatchSettingsChanged(services: AppServices, settings: AppSettings): void {
  const ctx = createMainProcessContext(services)
  for (const mod of getMainProcessModules()) {
    mod.onSettingsChanged?.(ctx, settings)
  }
}
