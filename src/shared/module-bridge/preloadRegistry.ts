import type { IpcRenderer } from 'electron'

export interface IPreloadModule {
  readonly id: string
  readonly order?: number
  getPreloadApi(ipcRenderer: IpcRenderer): Record<string, unknown>
}

const modules: IPreloadModule[] = []

export function registerPreloadModule(module: IPreloadModule): void {
  if (modules.some((item) => item.id === module.id)) return
  modules.push(module)
}

export function getPreloadModules(): readonly IPreloadModule[] {
  return [...modules].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}
