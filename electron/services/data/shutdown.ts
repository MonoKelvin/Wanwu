import type { AppServices } from '../../ipc/types'
import { getMainProcessModules } from '../../../src/shared/module-bridge/mainProcessRegistry'
import { createMainProcessContext } from '../../app/mainProcessContext'

/** 备份/迁移/恢复前关闭所有 SQLite 与其它数据服务，避免 Windows 文件锁 */
export function shutdownDataServices(services: AppServices): void {
  const ctx = createMainProcessContext(services)

  for (const mod of getMainProcessModules()) {
    try {
      mod.onDispose?.(ctx)
    } catch {
      /* ignore */
    }
  }

  try {
    services.db?.close()
  } catch {
    /* ignore */
  }

  services.moduleRuntime.clear()
  services.db = null
  services.media = null
  services.userData = null
}
