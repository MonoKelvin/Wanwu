import { defineStore } from 'pinia'
import { ref } from 'vue'
import { modulePathById, type ModuleId } from '@app/config/modules'

export type { ModuleId }

function defaultModulePaths(): Record<ModuleId, string> {
  return {
    library: modulePathById('library'),
    rss: modulePathById('rss'),
    'cloud-abode': modulePathById('cloud-abode'),
    personal: modulePathById('personal'),
    settings: modulePathById('settings')
  }
}

export const useAppStore = defineStore('app', () => {
  const activeModule = ref<ModuleId>('library')
  const subPanelTitle = ref('')
  /** 会话内各模块上次访问路径（切换主导航时恢复，可含物品详情） */
  const lastPathByModule = ref<Record<ModuleId, string>>(defaultModulePaths())
  /** 本次打开物品详情前的页面（详情返回用，与主导航历史栈无关） */
  const itemDetailReturnPath = ref<string | null>(null)

  function setModule(id: ModuleId) {
    activeModule.value = id
  }

  function rememberModulePath(id: ModuleId, path: string) {
    if (!path || lastPathByModule.value[id] === path) return
    lastPathByModule.value = { ...lastPathByModule.value, [id]: path }
  }

  function rememberItemDetailReturn(path: string) {
    if (!path) return
    itemDetailReturnPath.value = path
  }

  function pathForModule(id: ModuleId): string {
    return lastPathByModule.value[id] ?? modulePathById(id)
  }

  return {
    activeModule,
    subPanelTitle,
    lastPathByModule,
    itemDetailReturnPath,
    setModule,
    rememberModulePath,
    rememberItemDetailReturn,
    pathForModule
  }
})
