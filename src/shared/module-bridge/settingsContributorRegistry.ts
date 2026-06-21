/** 各业务模块向框架注册设置归一化、legacy 迁移与 patch 合并逻辑 */
export interface SettingsContributor {
  readonly moduleId: string
  readonly order?: number
  /** 从扁平 legacy 字段提取到 moduleSettings[moduleId]；无 legacy 时返回 null */
  migrateLegacy(raw: Record<string, unknown>): Record<string, unknown> | null
  /** 将 moduleSettings[moduleId] 归一化为模块标准结构 */
  normalize(stored: Record<string, unknown> | undefined): Record<string, unknown>
  /** 合并模块级 patch */
  mergePatch(
    current: Record<string, unknown>,
    patch: Record<string, unknown>
  ): Record<string, unknown>
}

const contributors: SettingsContributor[] = []

export function registerSettingsContributor(contributor: SettingsContributor): void {
  contributors.push(contributor)
  contributors.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export function getSettingsContributors(): readonly SettingsContributor[] {
  return contributors
}

export function findSettingsContributor(moduleId: string): SettingsContributor | undefined {
  return contributors.find((c) => c.moduleId === moduleId)
}
