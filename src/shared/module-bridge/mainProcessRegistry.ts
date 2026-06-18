import type Database from 'better-sqlite3'
import type { IpcRenderer } from 'electron'
import type { QuickAccessHit } from '../types/quickAccess'

/** 主进程初始化上下文（框架提供，模块只读使用） */
export interface MainProcessInitContext {
  readonly services: MainProcessCoreServices
}

/** 框架核心服务（不含任何业务模块字段） */
export interface MainProcessCoreServices {
  db: unknown
  userData: unknown
  media: unknown
  /** 插件模块运行时服务，按 module id 索引 */
  readonly moduleRuntime: Map<string, unknown>
}

export interface IMainProcessModule {
  readonly id: string
  readonly order?: number
  initServices?(ctx: MainProcessInitContext): void | Promise<void>
  onModulesReady?(ctx: MainProcessInitContext): void | Promise<void>
  registerIpcHandlers?(ctx: MainProcessInitContext): void
  registerDatabaseSchema?(db: Database.Database): void
  getPreloadApi?(ipcRenderer: IpcRenderer): Record<string, unknown>
  searchQuickAccess?(
    ctx: MainProcessInitContext,
    query: string,
    limit: number
  ): QuickAccessHit[] | Promise<QuickAccessHit[]>
  getQuickAccessKindLimit?(): { kind: string; limit: number; order?: number } | null
  getTrayStatusSlice?(
    ctx: MainProcessInitContext
  ): Promise<Record<string, unknown>> | Record<string, unknown>
  getClipboardAssistHints?(
    ctx: MainProcessInitContext,
    text: string,
    limit: number
  ): Promise<QuickAccessHit[]> | QuickAccessHit[]
  onSettingsChanged?(ctx: MainProcessInitContext, settings: import('../types/settings').AppSettings): void
  onDispose?(ctx: MainProcessInitContext): void
}

const modules: IMainProcessModule[] = []

export function registerMainProcessModule(module: IMainProcessModule): void {
  if (modules.some((item) => item.id === module.id)) return
  modules.push(module)
}

export function getMainProcessModules(): readonly IMainProcessModule[] {
  return [...modules].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export function getMainProcessModule(id: string): IMainProcessModule | undefined {
  return modules.find((item) => item.id === id)
}

export function getModuleRuntimeService<T>(ctx: MainProcessInitContext, moduleId: string): T | null {
  return (ctx.services.moduleRuntime.get(moduleId) as T | undefined) ?? null
}

export function setModuleRuntimeService(
  ctx: MainProcessInitContext,
  moduleId: string,
  service: unknown
): void {
  ctx.services.moduleRuntime.set(moduleId, service)
}
