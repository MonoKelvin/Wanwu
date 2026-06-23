import type { WppMetaFile } from '@modules/library/pixel-art/domain/types'
import { computePixelUnitSize, findTemplateBySize } from '@modules/library/pixel-art/lib/pixelDisplayMapping'

/** 画布显示与网格的常用初始设置（按模板尺寸） */
export interface PixelCanvasPreset {
  pixelUnitSize: number
  gridSubdiv: number
  gridVisible: boolean
  checkerboardVisible: boolean
}

const FALLBACK: PixelCanvasPreset = {
  pixelUnitSize: 1,
  gridSubdiv: 1,
  gridVisible: true,
  checkerboardVisible: true
}

export function getPixelCanvasPreset(width: number, height = width): PixelCanvasPreset {
  const template = findTemplateBySize(width, height)
  const pixelUnitSize = computePixelUnitSize(width, height)
  return {
    pixelUnitSize,
    gridSubdiv: 1,
    gridVisible: true,
    checkerboardVisible: true,
    ...(template ? {} : {})
  }
}

export function getPixelUnitSize(meta: Pick<WppMetaFile, 'display'>): number {
  const size = meta.display?.pixelUnitSize
  if (typeof size === 'number' && size >= 1 && size <= 64) return Math.floor(size)
  return 1
}

export function normalizePixelMetaDisplay(meta: WppMetaFile): WppMetaFile {
  const preset = getPixelCanvasPreset(meta.width, meta.height)
  const computedUnit = computePixelUnitSize(meta.width, meta.height)
  let pixelUnitSize = meta.display?.pixelUnitSize ?? preset.pixelUnitSize
  let gridSize = meta.grid?.size ?? preset.gridSubdiv
  let viewport = meta.viewport

  // 旧版向导误将「显示 1:N」写入 display.pixelUnitSize，应存于 grid.size
  if (
    pixelUnitSize !== computedUnit &&
    pixelUnitSize > computedUnit &&
    pixelUnitSize <= 64 &&
    gridSize === preset.gridSubdiv
  ) {
    gridSize = Math.max(1, Math.min(16, Math.floor(pixelUnitSize)))
    pixelUnitSize = computedUnit
    viewport = undefined
  }

  return {
    ...meta,
    display: { pixelUnitSize: getPixelUnitSize({ display: { pixelUnitSize } }) },
    grid: {
      visible: meta.grid?.visible ?? preset.gridVisible,
      size: Math.max(1, Math.min(16, gridSize))
    },
    checkerboard: {
      visible: meta.checkerboard?.visible ?? preset.checkerboardVisible
    },
    viewport
  }
}

export function zoomPercentFromViewport(zoom: number, pixelUnitSize: number): number {
  const unit = Math.max(1, pixelUnitSize)
  return Math.round((zoom / unit) * 100)
}

export { computeMappingRatio, formatMappingCaption, computePixelUnitSize } from '@modules/library/pixel-art/lib/pixelDisplayMapping'
