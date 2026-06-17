import type { AppServices } from '../../ipc/types'

/** 备份/迁移/恢复前关闭所有 SQLite 与其它数据服务，避免 Windows 文件锁 */
export function shutdownDataServices(services: AppServices): void {
  try {
    services.music?.close()
  } catch {
    /* ignore */
  }
  try {
    services.cloudAbode?.close()
  } catch {
    /* ignore */
  }
  try {
    services.links?.close()
  } catch {
    /* ignore */
  }
  try {
    services.diagrams?.close()
  } catch {
    /* ignore */
  }
  try {
    services.db?.close()
  } catch {
    /* ignore */
  }

  services.db = null
  services.personal = null
  services.library = null
  services.links = null
  services.diagrams = null
  services.rss = null
  services.music = null
  services.media = null
  services.notes = null
  services.userData = null
  services.cloudAbode = null
}
