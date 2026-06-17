import type { Component } from 'vue'
import type { WwIconName } from '@shared/icons/registry'

/** 设置页分区 ID（由各模块通过 registerSettingsSection 注册） */
export type SettingsSection = 'app' | 'library' | 'rss' | 'music' | 'data' | 'about'

export interface ISettingsSectionContributor {
  readonly id: SettingsSection
  readonly label: string
  readonly icon: WwIconName
  readonly order?: number
  loadPanel?(): Promise<Component>
}

const sections: ISettingsSectionContributor[] = []

export function registerSettingsSection(contributor: ISettingsSectionContributor): void {
  sections.push(contributor)
}

export function collectSettingsSections(): ISettingsSectionContributor[] {
  return [...sections].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export function getSettingsSection(id: SettingsSection): ISettingsSectionContributor | undefined {
  return sections.find((item) => item.id === id)
}
