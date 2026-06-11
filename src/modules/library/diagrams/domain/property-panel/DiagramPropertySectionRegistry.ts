import type { IDiagramPropertySectionRegistry } from '@modules/library/diagrams/domain/property-panel/interfaces'
import type {
  DiagramPropertyContext,
  DiagramPropertyTab,
  IDiagramPropertySectionProvider,
  ResolvedPropertySection
} from '@modules/library/diagrams/domain/property-panel/types'

export class DiagramPropertySectionRegistry implements IDiagramPropertySectionRegistry {
  private readonly providers = new Map<string, IDiagramPropertySectionProvider>()

  register(provider: IDiagramPropertySectionProvider): void {
    this.providers.set(provider.id, provider)
  }

  registerMany(providers: readonly IDiagramPropertySectionProvider[]): void {
    for (const provider of providers) {
      this.register(provider)
    }
  }

  resolve(tab: DiagramPropertyTab, ctx: DiagramPropertyContext): ResolvedPropertySection[] {
    const extensionOrderOverride =
      ctx.sectionPolicy?.extensionOrder ??
      (ctx.shapeExtKind ? 100 : undefined)

    const resolved: ResolvedPropertySection[] = []
    const seenProviderIds = new Set<string>()

    for (const provider of this.providers.values()) {
      if (seenProviderIds.has(provider.id)) continue
      seenProviderIds.add(provider.id)

      const tabs = Array.isArray(provider.tab) ? provider.tab : [provider.tab]
      if (!tabs.includes(tab)) continue
      if (!provider.visible(ctx)) continue

      let order = provider.order
      if (provider.id === 'node-shape-extension' && extensionOrderOverride != null) {
        order = extensionOrderOverride
      }

      const instanceKey = provider.sectionKey?.(ctx)
      const key = instanceKey ? `${provider.id}:${instanceKey}` : provider.id
      resolved.push({
        id: provider.id,
        key,
        order,
        component: provider.component
      })
    }

    return resolved.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  }
}

let registryInstance: DiagramPropertySectionRegistry | null = null

export function getDiagramPropertySectionRegistry(): DiagramPropertySectionRegistry {
  if (!registryInstance) {
    registryInstance = new DiagramPropertySectionRegistry()
  }
  return registryInstance
}

export function resetDiagramPropertySectionRegistry(): void {
  registryInstance = null
}
