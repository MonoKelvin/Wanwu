import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ModuleId = 'library' | 'rss' | 'personal' | 'settings'

export const useAppStore = defineStore('app', () => {
  const activeModule = ref<ModuleId>('library')
  const subPanelTitle = ref('')

  function setModule(id: ModuleId) {
    activeModule.value = id
  }

  return { activeModule, subPanelTitle, setModule }
})
