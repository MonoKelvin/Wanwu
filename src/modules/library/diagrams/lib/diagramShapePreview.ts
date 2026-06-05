/** 图元预览几何（归一化坐标，中心为 0,0，约 ±1 单位） */

export type ShapePreviewSpec =
  | { kind: 'rect'; w: number; h: number; r?: number }
  | { kind: 'circle'; r: number }
  | { kind: 'ellipse'; rx: number; ry: number }
  | { kind: 'diamond'; rx: number; ry: number }
  | { kind: 'polygon'; points: [number, number][] }
  | { kind: 'path'; d: string }
  | { kind: 'text' }

const PREVIEW_SIZE = 22
const PREVIEW_PAD = 1

export function previewViewBox(): string {
  return `0 0 ${PREVIEW_SIZE} ${PREVIEW_SIZE}`
}

function toSvgPoint(x: number, y: number, bounds: { minX: number; maxX: number; minY: number; maxY: number }) {
  const spanX = bounds.maxX - bounds.minX || 1
  const spanY = bounds.maxY - bounds.minY || 1
  const scale = (PREVIEW_SIZE - PREVIEW_PAD * 2) / Math.max(spanX, spanY)
  const cx = (bounds.minX + bounds.maxX) / 2
  const cy = (bounds.minY + bounds.maxY) / 2
  const sx = PREVIEW_SIZE / 2 + (x - cx) * scale
  const sy = PREVIEW_SIZE / 2 + (y - cy) * scale
  return `${sx},${sy}`
}

function boundsFromPoints(points: [number, number][]) {
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys)
  }
}

export function polygonPreviewPoints(points: [number, number][]): string {
  const b = boundsFromPoints(points)
  return points.map((p) => toSvgPoint(p[0], p[1], b)).join(' ')
}

export function rectPreviewAttrs(spec: Extract<ShapePreviewSpec, { kind: 'rect' }>) {
  const b = boundsFromPoints([
    [-spec.w / 2, -spec.h / 2],
    [spec.w / 2, spec.h / 2]
  ])
  const w = (spec.w / Math.max(spec.w, spec.h)) * (PREVIEW_SIZE - PREVIEW_PAD * 2)
  const h = (spec.h / Math.max(spec.w, spec.h)) * (PREVIEW_SIZE - PREVIEW_PAD * 2)
  return {
    x: PREVIEW_SIZE / 2 - w / 2,
    y: PREVIEW_SIZE / 2 - h / 2,
    width: w,
    height: h,
    rx: spec.r ? (spec.r / Math.max(spec.w, spec.h)) * (PREVIEW_SIZE - PREVIEW_PAD * 2) : 0,
    bounds: b
  }
}

export function circlePreviewAttrs(spec: Extract<ShapePreviewSpec, { kind: 'circle' }>) {
  const r = (spec.r / (spec.r * 2)) * ((PREVIEW_SIZE - PREVIEW_PAD * 2) / 2)
  return {
    cx: PREVIEW_SIZE / 2,
    cy: PREVIEW_SIZE / 2,
    r
  }
}

export function ellipsePreviewAttrs(spec: Extract<ShapePreviewSpec, { kind: 'ellipse' }>) {
  const scale = (PREVIEW_SIZE - PREVIEW_PAD * 2) / (Math.max(spec.rx, spec.ry) * 2)
  return {
    cx: PREVIEW_SIZE / 2,
    cy: PREVIEW_SIZE / 2,
    rx: spec.rx * scale,
    ry: spec.ry * scale
  }
}

export function diamondPreviewPoints(spec: Extract<ShapePreviewSpec, { kind: 'diamond' }>) {
  return polygonPreviewPoints([
    [0, -spec.ry],
    [spec.rx, 0],
    [0, spec.ry],
    [-spec.rx, 0]
  ])
}
