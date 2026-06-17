import type { Component } from 'vue'

export interface ISubPanelContributor {
  readonly moduleId: string
  loadComponent(): Promise<Component>
}

const contributors: ISubPanelContributor[] = []

export function registerSubPanelContributor(contributor: ISubPanelContributor): void {
  contributors.push(contributor)
}

export function resolveSubPanel(moduleId: string | undefined): ISubPanelContributor | null {
  if (!moduleId) return null
  return contributors.find((item) => item.moduleId === moduleId) ?? null
}

export function moduleHasSubPanel(moduleId: string): boolean {
  return contributors.some((item) => item.moduleId === moduleId)
}
