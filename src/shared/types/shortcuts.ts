export interface WwShortcutRow {
  keys: string
  action: string
}

export interface WwShortcutSection {
  title: string
  rows: WwShortcutRow[]
}
