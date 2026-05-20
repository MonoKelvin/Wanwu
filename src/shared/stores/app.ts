import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ModuleId } from '@app/config/modules'

export type { ModuleId }

export const useAppStore = defineStore('app', () => {
  const activeModule = ref<ModuleId>('library')
  const subPanelTitle = ref('')

  function setModule(id: ModuleId) {
    activeModule.value = id
  }

  return { activeModule, subPanelTitle, setModule }
})
