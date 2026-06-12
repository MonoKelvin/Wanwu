import type LogicFlow from '@logicflow/core'
import {
  backgroundForPreset,
  logicFlowThemeForPreset,
  resolveThemeFromPreset
} from '@modules/library/diagrams/lib/diagramCanvasPresets'
import {
  diagramCanvasBackground,
  type DiagramCanvasTheme
} from '@modules/library/diagrams/lib/diagramCanvasTheme'
import { applyEdgeProperties } from '@modules/library/diagrams/lib/diagramStyleBridge'
import type { DiagramCanvasSettings } from '@modules/library/diagrams/lib/diagramSelectionTypes'
import { defaultCanvasSettings } from '@modules/library/diagrams/lib/diagramSelectionTypes'

export interface DiagramCanvasThemeCoordinatorPorts {
  getLf(): LogicFlow | null
  getContainer(): HTMLElement | null
  getCanvasSettings(): DiagramCanvasSettings
  setCanvasSettings(settings: DiagramCanvasSettings): void
  getResolvedTheme(): DiagramCanvasTheme
  setResolvedTheme(theme: DiagramCanvasTheme): void
  publishSelection(): void
  refreshAxisOverlay(): void
  refreshMultiSelectOverlay(): void
}

/** 画布主题、背景、小地图与编辑配置 */
export class DiagramCanvasThemeCoordinator {
  constructor(private readonly ports: DiagramCanvasThemeCoordinatorPorts) {}

  applyBackgroundColor(color: string): void {
    const lf = this.ports.getLf()
    if (!lf) return
    lf.graphModel.updateBackgroundOptions({ background: color, backgroundColor: color })
    this.patchBackgroundDom(color)
  }

  patchBackgroundDom(color: string): void {
    const root = this.ports.getContainer()
    if (!root) return
    const apply = (el: HTMLElement) => {
      el.style.setProperty('background', color, 'important')
      el.style.setProperty('background-color', color, 'important')
      el.style.setProperty('border', 'none', 'important')
      el.style.setProperty('outline', 'none', 'important')
      el.style.setProperty('box-shadow', 'none', 'important')
    }
    apply(root)
    root.querySelectorAll<HTMLElement>('.lf-background-area, .lf-graph, .lf-grid, .lf-background').forEach(apply)
  }

  setTheme(resolved: 'light' | 'dark'): void {
    this.ports.setResolvedTheme(resolved)
    const settings = this.ports.getCanvasSettings()
    const preset = settings.themePreset
    if (preset === 'classic-light' || preset === 'classic-dark') {
      this.ports.setCanvasSettings({
        ...settings,
        themePreset: resolved === 'dark' ? 'classic-dark' : 'classic-light',
        backgroundColor: diagramCanvasBackground(resolved)
      })
    }
    this.applyTheme()
    this.ports.refreshAxisOverlay()
    this.ports.refreshMultiSelectOverlay()
  }

  loadCanvasSettings(settings: DiagramCanvasSettings | undefined): void {
    const resolved = this.ports.getResolvedTheme()
    const base = defaultCanvasSettings(resolved)
    if (settings) {
      this.ports.setCanvasSettings({
        ...base,
        ...settings,
        defaultEdge: { ...base.defaultEdge, ...(settings.defaultEdge ?? {}) }
      })
    }
    if (this.ports.getLf()) {
      this.applyCanvasSettings(this.ports.getCanvasSettings())
    }
  }

  applyCanvasSettings(settings: Partial<DiagramCanvasSettings>): void {
    const current = this.ports.getCanvasSettings()
    const nextDefaultEdge = settings.defaultEdge
      ? { ...current.defaultEdge, ...settings.defaultEdge }
      : current.defaultEdge
    const next = { ...current, ...settings, defaultEdge: nextDefaultEdge }
    this.ports.setCanvasSettings(next)

    const lf = this.ports.getLf()
    if (!lf) return

    const { gridVisible, backgroundColor, miniMapVisible, themePreset } = next

    lf.updateEditConfig({ snapGrid: false })
    if (!next.snapGrid) {
      lf.removeNodeSnapLine()
    }
    const theme = lf.getTheme()
    lf.setTheme({
      ...theme,
      grid: { ...(theme.grid as object), visible: gridVisible }
    })

    if (themePreset) {
      this.applyTheme()
    } else if (backgroundColor) {
      this.applyBackgroundColor(backgroundColor)
    }

    if (miniMapVisible) this.showMiniMap()
    else this.hideMiniMap()

    this.ports.refreshAxisOverlay()

    if (settings.themePreset) {
      this.ports.refreshAxisOverlay()
      this.ports.refreshMultiSelectOverlay()
    }

    this.ports.publishSelection()
  }

  applyDefaultEdgeStyle(edgeId: string): void {
    const lf = this.ports.getLf()
    if (!lf) return
    const model = lf.getEdgeModelById(edgeId)
    if (!model) return
    const props = (model.properties ?? {}) as Record<string, unknown>
    const style = (props.style ?? {}) as Record<string, unknown>
    if (
      style.stroke != null ||
      style.strokeWidth != null ||
      style.strokeDasharray != null ||
      props.stroke != null ||
      props.strokeWidth != null
    ) {
      return
    }
    const d = this.ports.getCanvasSettings().defaultEdge
    applyEdgeProperties(lf, {
      id: edgeId,
      type: d.type,
      stroke: d.stroke,
      strokeWidth: d.strokeWidth,
      strokeDasharray: d.strokeDasharray,
      startArrowType: d.startArrowType,
      endArrowType: d.endArrowType
    })
  }

  hideMiniMap(): void {
    const ext = this.ports.getLf()?.extension?.miniMap as { hide?: () => void } | undefined
    ext?.hide?.()
  }

  getBackgroundColorForExport(): string {
    const settings = this.ports.getCanvasSettings()
    return settings.backgroundColor || diagramCanvasBackground(this.ports.getResolvedTheme())
  }

  private applyTheme(): void {
    const lf = this.ports.getLf()
    if (!lf) return
    const settings = this.ports.getCanvasSettings()
    const preset = settings.themePreset
    const resolved = resolveThemeFromPreset(preset, this.ports.getResolvedTheme())
    const theme = logicFlowThemeForPreset(preset, resolved)
    lf.setTheme(theme as never, resolved === 'dark' ? 'dark' : 'default')

    const bg = settings.backgroundColor || backgroundForPreset(preset, resolved)
    this.applyBackgroundColor(bg)
    this.refreshEdgeLabelViews(lf)
  }

  private showMiniMap(): void {
    const ext = this.ports.getLf()?.extension?.miniMap as
      | { show?: () => void; isShow?: boolean; setShowEdge?: (show: boolean) => void }
      | undefined
    ext?.setShowEdge?.(true)
    if (ext?.show && !ext.isShow) {
      ext.show()
    }
  }

  private refreshEdgeLabelViews(lf: LogicFlow): void {
    for (const edge of lf.graphModel.edges) {
      const value =
        typeof edge.text === 'object' && edge.text && 'value' in edge.text
          ? String((edge.text as { value?: string }).value ?? '')
          : ''
      if (value) edge.updateText(value)
    }
  }
}
