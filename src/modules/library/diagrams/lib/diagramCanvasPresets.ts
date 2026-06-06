import type { DiagramThemePreset } from '@modules/library/diagrams/lib/diagramEditorConstants'
import {
  diagramCanvasBackground,
  diagramGridOptions,
  diagramLogicFlowTheme,
  type DiagramCanvasTheme
} from '@modules/library/diagrams/lib/diagramCanvasTheme'

export function resolveThemeFromPreset(
  preset: DiagramThemePreset,
  appTheme: DiagramCanvasTheme
): DiagramCanvasTheme {
  if (preset === 'classic-dark' || preset === 'blueprint' || preset === 'slate') return 'dark'
  if (preset === 'classic-light' || preset === 'paper') return 'light'
  return appTheme
}

export function backgroundForPreset(preset: DiagramThemePreset, resolved: DiagramCanvasTheme): string {
  if (preset === 'blueprint') return '#0f2744'
  if (preset === 'paper') return '#faf8f4'
  if (preset === 'slate') return '#1e2228'
  return diagramCanvasBackground(resolved)
}

export function logicFlowThemeForPreset(
  preset: DiagramThemePreset,
  resolved: DiagramCanvasTheme
): Record<string, unknown> {
  const base = diagramLogicFlowTheme(resolved)
  const bg = backgroundForPreset(preset, resolved)

  if (preset === 'blueprint') {
    const baseRect = (base.rect ?? {}) as Record<string, unknown>
    const baseCircle = (base.circle ?? {}) as Record<string, unknown>
    const baseDiamond = (base.diamond ?? {}) as Record<string, unknown>
    return {
      ...base,
      background: { backgroundColor: bg },
      grid: {
        ...diagramGridOptions('dark'),
        config: { color: '#2a5080', thickness: 1 }
      },
      rect: { ...baseRect, fill: '#1a3a5c', stroke: '#5b9bd5' },
      circle: { ...baseCircle, fill: '#1a3a5c', stroke: '#5b9bd5' },
      diamond: { ...baseDiamond, fill: '#1a3a5c', stroke: '#5b9bd5' },
      polyline: { stroke: '#7ec8ff', strokeWidth: 1.5 },
      line: { stroke: '#7ec8ff', strokeWidth: 1.5 },
      bezier: { stroke: '#7ec8ff', strokeWidth: 1.5, fill: 'none' }
    }
  }

  if (preset === 'paper') {
    const baseRect = (base.rect ?? {}) as Record<string, unknown>
    return {
      ...base,
      background: { backgroundColor: bg },
      grid: {
        ...diagramGridOptions('light'),
        config: { color: '#e8e0d4', thickness: 1 }
      },
      rect: { ...baseRect, fill: '#fffef9', stroke: '#c8bfb0' }
    }
  }

  if (preset === 'slate') {
    const baseRect = (base.rect ?? {}) as Record<string, unknown>
    return {
      ...base,
      background: { backgroundColor: bg },
      grid: {
        ...diagramGridOptions('dark'),
        config: { color: '#3a424d', thickness: 1 }
      },
      rect: { ...baseRect, fill: '#2a3038', stroke: '#6b7685' },
      polyline: { stroke: '#9aa5b5', strokeWidth: 1.5 }
    }
  }

  return {
    ...base,
    background: { backgroundColor: bg }
  }
}

export function shadowStyleForPreset(preset: import('@modules/library/diagrams/lib/diagramEditorConstants').DiagramShadowPreset) {
  if (preset === 'none') return undefined
  if (preset === 'soft') {
    return { dx: 0, dy: 2, stdDeviation: 3, floodColor: '#00000022' }
  }
  if (preset === 'medium') {
    return { dx: 0, dy: 4, stdDeviation: 6, floodColor: '#00000033' }
  }
  return { dx: 0, dy: 6, stdDeviation: 10, floodColor: '#00000044' }
}
