import type { AppServices } from '../ipc/types'

/** 框架通用：按 module id 从运行时注册表取服务（无业务类型） */
export function getRuntimeService<T>(services: AppServices, moduleId: string): T | null {
  return (services.moduleRuntime.get(moduleId) as T | undefined) ?? null
}
