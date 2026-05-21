import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@shared/stores/settings'
import { appLogoFor, resolveAppLogo, type AppLogoSize } from '@shared/assets/app-logo'

/** 随主题切换的应用 Logo（浅色白底黑字 / 深色黑底白字） */
export function useAppLogo() {
  const { settings } = storeToRefs(useSettingsStore())
  const scheme = computed(() => settings.value.colorScheme)
  const set = computed(() => resolveAppLogo(scheme.value))
  const nav = computed(() => appLogoFor(scheme.value, 32))
  const about = computed(() => appLogoFor(scheme.value, 128))

  function at(size: AppLogoSize) {
    return computed(() => appLogoFor(scheme.value, size))
  }

  return { scheme, set, nav, about, at }
}
