import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@shared/stores/settings'
import {
  FONT_CATEGORY_LABELS,
  fontCatalogLabel,
  type FontCatalogCategory
} from '@shared/lib/fontCatalog'
import { resolveAvailableFontCatalog } from '@shared/lib/systemFonts'

export interface FontSelectOption {
  label: string
  value: string
}

export interface FontSelectOptionGroup {
  label: string
  items: FontSelectOption[]
}

const CATEGORY_ORDER: FontCatalogCategory[] = ['chinese', 'english', 'mono']

export function useFontSelectOptions() {
  const settingsStore = useSettingsStore()
  const { settings } = storeToRefs(settingsStore)
  const catalogByCategory = ref<Record<FontCatalogCategory, FontSelectOption[]>>({
    chinese: [],
    english: [],
    mono: []
  })
  const ready = ref(false)

  onMounted(async () => {
    const entries = await resolveAvailableFontCatalog()
    const next: Record<FontCatalogCategory, FontSelectOption[]> = {
      chinese: [],
      english: [],
      mono: []
    }
    for (const entry of entries) {
      next[entry.category].push({
        label: entry.label,
        value: entry.value
      })
    }
    catalogByCategory.value = next
    ready.value = true
  })

  const optionGroups = computed<FontSelectOptionGroup[]>(() => {
    const groups: FontSelectOptionGroup[] = [
      {
        label: '系统',
        items: [{ label: '默认', value: '' }]
      }
    ]

    const recent = settings.value.recentFonts
      .filter((family) => family.trim())
      .map((family) => ({
        label: fontCatalogLabel(family),
        value: family
      }))
    if (recent.length) {
      groups.push({ label: '最近使用', items: recent })
    }

    for (const category of CATEGORY_ORDER) {
      const items = catalogByCategory.value[category]
      if (items.length) {
        groups.push({
          label: FONT_CATEGORY_LABELS[category],
          items
        })
      }
    }

    return groups
  })

  return { optionGroups, ready }
}
