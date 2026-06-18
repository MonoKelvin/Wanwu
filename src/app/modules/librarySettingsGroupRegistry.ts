import type { Component } from 'vue'

export interface ILibrarySettingsGroupContributor {
  readonly id: string
  readonly label: string
  readonly order?: number
  loadPanel(): Promise<Component>
}

const groups: ILibrarySettingsGroupContributor[] = []

export function registerLibrarySettingsGroup(contributor: ILibrarySettingsGroupContributor): void {
  groups.push(contributor)
}

export function collectLibrarySettingsGroups(): ILibrarySettingsGroupContributor[] {
  return [...groups].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}
