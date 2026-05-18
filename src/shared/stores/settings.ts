import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import {
  DEFAULT_APP_SETTINGS,
  type AppSettings,
  type NavAlign,
  type NavDisplay,
  type RssFetchLimit
} from '@shared/types/settings'

function applySettingsToDocument(settings: AppSettings) {
  const root = document.documentElement
  root.dataset.navAlign = settings.navAlign
  root.dataset.navDisplay = settings.navDisplay
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({ ...DEFAULT_APP_SETTINGS })
  const loaded = ref(false)

  function normalizeSettings(data: Partial<AppSettings>): AppSettings {
    const limit = data.rssFetchLimit
    const rssFetchLimit: RssFetchLimit = limit === 30 || limit === 50 ? limit : 20
    return {
      navAlign: data.navAlign === 'start' ? 'start' : 'center',
      navDisplay: data.navDisplay === 'both' ? 'both' : 'icon',
      rssFetchLimit
    }
  }

  async function load() {
    const data = await window.wanwu.app.getSettings()
    settings.value = normalizeSettings({ ...DEFAULT_APP_SETTINGS, ...data })
    loaded.value = true
    applySettingsToDocument(settings.value)
  }

  async function save(patch: Partial<AppSettings>) {
    settings.value = { ...settings.value, ...patch }
    await window.wanwu.app.updateSettings(settings.value)
    applySettingsToDocument(settings.value)
  }

  async function setNavAlign(navAlign: NavAlign) {
    await save({ navAlign })
  }

  async function setNavDisplay(navDisplay: NavDisplay) {
    await save({ navDisplay })
  }

  async function setRssFetchLimit(rssFetchLimit: RssFetchLimit) {
    await save({ rssFetchLimit })
  }

  watch(
    settings,
    (v) => {
      if (loaded.value) applySettingsToDocument(v)
    },
    { deep: true }
  )

  return { settings, loaded, load, save, setNavAlign, setNavDisplay, setRssFetchLimit }
})
