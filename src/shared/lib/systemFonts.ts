import { FONT_CATALOG, type FontCatalogEntry } from '@shared/lib/fontCatalog'

let installedFamilies: Set<string> | null = null
let loadPromise: Promise<Set<string>> | null = null

function normalizeFamilyName(name: string): string {
  return name.trim().toLowerCase()
}

function familyInstalled(family: string, installed: Set<string>): boolean {
  if (installed.size === 0) return true
  return installed.has(normalizeFamilyName(family))
}

async function loadInstalledFontFamilies(): Promise<Set<string>> {
  try {
    if (typeof queryLocalFonts === 'function') {
      const fonts = await queryLocalFonts()
      const families = new Set<string>()
      for (const font of fonts) {
        if (typeof font.family === 'string' && font.family.trim()) {
          families.add(normalizeFamilyName(font.family))
        }
      }
      return families
    }
  } catch {
    /* 权限或未启用时回退到完整候选列表 */
  }
  return new Set()
}

export async function getInstalledFontFamilies(): Promise<Set<string>> {
  if (installedFamilies) return installedFamilies
  if (!loadPromise) {
    loadPromise = loadInstalledFontFamilies().then((set) => {
      installedFamilies = set
      return set
    })
  }
  return loadPromise
}

export async function resolveAvailableFontCatalog(): Promise<FontCatalogEntry[]> {
  const installed = await getInstalledFontFamilies()
  return FONT_CATALOG.filter((entry) => familyInstalled(entry.value, installed))
}

export function resetInstalledFontFamiliesCache(): void {
  installedFamilies = null
  loadPromise = null
}
