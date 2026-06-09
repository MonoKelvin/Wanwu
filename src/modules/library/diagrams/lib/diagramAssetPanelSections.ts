const STORAGE_KEY = 'wanwu.diagram.assetPanel.sections'

type SectionState = Record<string, boolean>

function readAll(): SectionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as SectionState
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(state: SectionState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore quota */
  }
}

export function defaultAssetSectionExpanded(sectionId: string): boolean {
  return sectionId === 'basic'
}

export function isAssetSectionExpanded(sectionId: string): boolean {
  const stored = readAll()[sectionId]
  return typeof stored === 'boolean' ? stored : defaultAssetSectionExpanded(sectionId)
}

export function setAssetSectionExpanded(sectionId: string, expanded: boolean): void {
  const state = readAll()
  state[sectionId] = expanded
  writeAll(state)
}
