import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@shared/stores/settings'
import {
  BUILTIN_PALETTE_GROUPS,
  GLOBAL_PALETTE_MODULE_ID,
  mergePaletteGroups,
  normalizePaletteGroups,
  type ColorPaletteGroup
} from '@shared/lib/globalColorPalettes'

const CUSTOM_KEY = 'customGroups'

function readCustomGroups(moduleSettings: Record<string, Record<string, unknown>>): ColorPaletteGroup[] {
  return normalizePaletteGroups(moduleSettings[GLOBAL_PALETTE_MODULE_ID]?.[CUSTOM_KEY])
}

export function useGlobalColorPalettes() {
  const settingsStore = useSettingsStore()
  const { settings } = storeToRefs(settingsStore)

  const customGroups = computed(() => readCustomGroups(settings.value.moduleSettings ?? {}))
  const groups = computed(() => mergePaletteGroups(customGroups.value))

  async function saveCustomGroups(next: ColorPaletteGroup[]) {
    await settingsStore.patchModuleSettings(GLOBAL_PALETTE_MODULE_ID, {
      [CUSTOM_KEY]: next.filter((g) => !g.builtin)
    })
  }

  async function addColorToGroup(groupId: string, color: string) {
    const normalized = color.trim()
    if (!normalized) return
    const custom = [...customGroups.value]
    let group = custom.find((g) => g.id === groupId)
    if (!group) {
      const builtin = BUILTIN_PALETTE_GROUPS.find((g) => g.id === groupId)
      if (!builtin) return
      group = { id: `${groupId}-user`, name: `${builtin.name}（我的）`, colors: [...builtin.colors] }
      custom.push(group)
    }
    if (group.colors.includes(normalized)) return
    group = { ...group, colors: [...group.colors, normalized] }
    const idx = custom.findIndex((g) => g.id === group!.id)
    if (idx >= 0) custom[idx] = group
    else custom.push(group)
    await saveCustomGroups(custom)
  }

  async function createCustomGroup(name: string, colors: string[] = []) {
    const id = `custom-${crypto.randomUUID()}`
    await saveCustomGroups([...customGroups.value, { id, name: name.trim() || '我的色板', colors }])
    return id
  }

  return { groups, customGroups, addColorToGroup, createCustomGroup, saveCustomGroups }
}
