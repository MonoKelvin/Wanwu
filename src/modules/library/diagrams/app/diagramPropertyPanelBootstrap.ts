import { registerDiagramShapeExtensionUi } from '@modules/library/diagrams/app/diagramShapeExtensionUi'
import CanvasDefaultEdgeSection from '@modules/library/diagrams/components/property-panel/sections/CanvasDefaultEdgeSection.vue'
import CanvasSettingsSection from '@modules/library/diagrams/components/property-panel/sections/CanvasSettingsSection.vue'
import EdgeArrowSection from '@modules/library/diagrams/components/property-panel/sections/EdgeArrowSection.vue'
import EdgeLineSection from '@modules/library/diagrams/components/property-panel/sections/EdgeLineSection.vue'
import EdgeTextSection from '@modules/library/diagrams/components/property-panel/sections/EdgeTextSection.vue'
import MultiSelectToolsSection from '@modules/library/diagrams/components/property-panel/sections/MultiSelectToolsSection.vue'
import NodeAppearanceSection from '@modules/library/diagrams/components/property-panel/sections/NodeAppearanceSection.vue'
import NodeGroupFrameSection from '@modules/library/diagrams/components/property-panel/sections/NodeGroupFrameSection.vue'
import NodeGroupedBannerSection from '@modules/library/diagrams/components/property-panel/sections/NodeGroupedBannerSection.vue'
import NodeImageSection from '@modules/library/diagrams/components/property-panel/sections/NodeImageSection.vue'
import NodeShapeExtensionSection from '@modules/library/diagrams/components/property-panel/sections/NodeShapeExtensionSection.vue'
import NodeSizeSection from '@modules/library/diagrams/components/property-panel/sections/NodeSizeSection.vue'
import NodeTextSection from '@modules/library/diagrams/components/property-panel/sections/NodeTextSection.vue'
import {
  getDiagramPropertySectionRegistry,
  type IDiagramPropertySectionProvider,
  hasSelectedNodes,
  hasSelectedEdges,
  hasShapeExtension,
  showNodeImageSection,
  shapeExtensionSectionKey
} from '@modules/library/diagrams/domain/property-panel'

const ALL_TABS = ['node', 'edge', 'canvas'] as const

const builtinSections: IDiagramPropertySectionProvider[] = [
  {
    id: 'multi-select-tools',
    tab: [...ALL_TABS],
    order: -100,
    visible: (ctx) => ctx.multiSelect || Boolean(ctx.selection.canUngroup),
    component: MultiSelectToolsSection
  },
  {
    id: 'node-group-frame',
    tab: 'node',
    order: 0,
    visible: (ctx) => hasSelectedNodes(ctx) && ctx.isGroupFrame,
    component: NodeGroupFrameSection
  },
  {
    id: 'node-grouped-banner',
    tab: 'node',
    order: 10,
    visible: (ctx) => hasSelectedNodes(ctx) && ctx.isGroupedMember && !ctx.isGroupFrame,
    component: NodeGroupedBannerSection
  },
  {
    id: 'node-shape-extension',
    tab: 'node',
    order: 100,
    visible: (ctx) =>
      hasSelectedNodes(ctx) &&
      !ctx.isGroupFrame &&
      Boolean(ctx.selectedNode) &&
      hasShapeExtension(ctx),
    component: NodeShapeExtensionSection,
    sectionKey: shapeExtensionSectionKey
  },
  {
    id: 'node-text',
    tab: 'node',
    order: 200,
    visible: (ctx) => hasSelectedNodes(ctx) && !ctx.isGroupFrame && Boolean(ctx.selectedNode),
    component: NodeTextSection
  },
  {
    id: 'node-size',
    tab: 'node',
    order: 300,
    visible: (ctx) => hasSelectedNodes(ctx) && !ctx.multiNode && !ctx.isGroupFrame && Boolean(ctx.selectedNode),
    component: NodeSizeSection
  },
  {
    id: 'node-image',
    tab: 'node',
    order: 350,
    visible: (ctx) => hasSelectedNodes(ctx) && !ctx.isGroupFrame && showNodeImageSection(ctx),
    component: NodeImageSection
  },
  {
    id: 'node-appearance',
    tab: 'node',
    order: 400,
    visible: (ctx) => hasSelectedNodes(ctx) && !ctx.isGroupFrame && Boolean(ctx.selectedNode),
    component: NodeAppearanceSection
  },
  {
    id: 'edge-text',
    tab: 'edge',
    order: 100,
    visible: (ctx) => hasSelectedEdges(ctx) && !ctx.multiEdge && Boolean(ctx.selectedEdge),
    component: EdgeTextSection
  },
  {
    id: 'edge-line',
    tab: 'edge',
    order: 200,
    visible: (ctx) => hasSelectedEdges(ctx) && Boolean(ctx.selectedEdge),
    component: EdgeLineSection
  },
  {
    id: 'edge-arrow',
    tab: 'edge',
    order: 300,
    visible: (ctx) => hasSelectedEdges(ctx) && Boolean(ctx.selectedEdge),
    component: EdgeArrowSection
  },
  {
    id: 'canvas-settings',
    tab: 'canvas',
    order: 100,
    visible: () => true,
    component: CanvasSettingsSection
  },
  {
    id: 'canvas-default-edge',
    tab: 'canvas',
    order: 200,
    visible: () => true,
    component: CanvasDefaultEdgeSection
  }
]

let bootstrapped = false

/** 渲染进程组合根：注册属性面板内置区块 */
export function registerDiagramPropertyPanel(
  registry = getDiagramPropertySectionRegistry()
): void {
  if (bootstrapped) return
  registerDiagramShapeExtensionUi()
  registry.registerMany(builtinSections)
  bootstrapped = true
}

export function resetDiagramPropertyPanelBootstrap(): void {
  bootstrapped = false
}
