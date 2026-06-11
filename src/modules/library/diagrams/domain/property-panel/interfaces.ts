import type {
  DiagramPropertyContext,
  DiagramPropertyTab,
  IDiagramPropertySectionProvider,
  ResolvedPropertySection
} from '@modules/library/diagrams/domain/property-panel/types'

/** 属性面板区块注册表抽象 — 扩展可通过 register 注入新区块 */
export interface IDiagramPropertySectionRegistry {
  register(provider: IDiagramPropertySectionProvider): void
  registerMany(providers: readonly IDiagramPropertySectionProvider[]): void
  resolve(tab: DiagramPropertyTab, ctx: DiagramPropertyContext): ResolvedPropertySection[]
}
