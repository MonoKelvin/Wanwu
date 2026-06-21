import type { Component } from 'vue'

/** 「设置 → 应用」分区内可插拔的设置组（由各业务模块注册） */
export interface IAppSettingsGroupContributor {
  readonly id: string
  readonly label: string
  readonly order?: number
  loadPanel(): Promise<Component>
}

const groups: IAppSettingsGroupContributor[] = []

export function registerAppSettingsGroup(contributor: IAppSettingsGroupContributor): void {
  groups.push(contributor)
}

export function collectAppSettingsGroups(): IAppSettingsGroupContributor[] {
  return [...groups].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}
