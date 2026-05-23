import { computed } from 'vue'
import { usePreferredColorScheme } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@shared/stores/settings'
import { appLogoFor, resolveAppLogo, type AppLogoSize } from '@shared/assets/app-logo'
import type { ResolvedColorScheme } from '@shared/types/settings'

/** 随主题切换的应用 Logo（浅色白底黑字 / 深色黑底白字） */
export function useAppLogo() {
  const { settings } = storeToRefs(useSettingsStore())
  const preferred = usePreferredColorScheme()

  const effectiveScheme = computed((): ResolvedColorScheme => {
    const pref = settings.value.colorScheme
    if (pref === 'system') return preferred.value === 'dark' ? 'dark' : 'light'
    return pref
  })

  const set = computed(() => resolveAppLogo(effectiveScheme.value))
  const nav = computed(() => appLogoFor(effectiveScheme.value, 32))
  const about = computed(() => appLogoFor(effectiveScheme.value, 128))

  function at(size: AppLogoSize) {
    return computed(() => appLogoFor(effectiveScheme.value, size))
  }

  return { scheme: effectiveScheme, set, nav, about, at }
}
