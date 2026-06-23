/**
 * 像素画布显示映射与模板工具
 *
 * 模板卡片预览将长边划分为 {@link TEMPLATE_PREVIEW_CELL_COUNT} 格；
 * 标签 `1:N` 表示每格代表 N 个画布像素（如 256×256 → 1:16）。
 *
 * `pixelUnitSize`：100% 缩放时 1 画布像素对应的屏幕像素数。
 */

export const TEMPLATE_PREVIEW_CELL_COUNT = 16

/** 新建/导入向导默认显示比例 1:N */
export const TEMPLATE_PREVIEW_PIXEL_RATIO = 8

/** 首页模板卡片底部比例说明（与 computeMappingRatio 一致） */
export function formatTemplateRatioCaption(width: number, height: number): string {
  return formatMappingCaption(width, height)
}

export interface PixelCanvasTemplate {
  id: string
  width: number
  height: number
  category: PixelTemplateCategory
  label?: string
}

export const PIXEL_TEMPLATE_CATEGORY_LABELS: Record<PixelTemplateCategory, string> = {
  square: '等比例',
  desktop: '电脑屏幕',
  mobile: '手机',
  web: 'Web 常用'
}

/** 新建画布模板（按分类顺序） */
export const PIXEL_CANVAS_TEMPLATES: PixelCanvasTemplate[] = [
  { id: 'sq-256', width: 256, height: 256, category: 'square' },
  { id: 'sq-512', width: 512, height: 512, category: 'square' },
  { id: 'sq-1024', width: 1024, height: 1024, category: 'square' },
  { id: 'sq-2048', width: 2048, height: 2048, category: 'square' },
  { id: 'desk-800x600', width: 800, height: 600, category: 'desktop', label: '800×600' },
  { id: 'desk-1366x768', width: 1366, height: 768, category: 'desktop', label: '1366×768' },
  { id: 'desk-1920x1080', width: 1920, height: 1080, category: 'desktop', label: '1920×1080' },
  { id: 'mob-720x1280', width: 720, height: 1280, category: 'mobile', label: '720×1280' },
  { id: 'mob-750x1624', width: 750, height: 1624, category: 'mobile', label: '750×1624 · iPhone' },
  { id: 'mob-1080x1920', width: 1080, height: 1920, category: 'mobile', label: '1080×1920' },
  { id: 'web-1280x720', width: 1280, height: 720, category: 'web', label: '1280×720' },
  { id: 'web-1440x900', width: 1440, height: 900, category: 'web', label: '1440×900' }
]

export function getTemplatesByCategory(category: PixelTemplateCategory): PixelCanvasTemplate[] {
  return PIXEL_CANVAS_TEMPLATES.filter((t) => t.category === category)
}

/** 每格代表的画布像素数（用于模板标签 1:N） */
export function computeMappingRatio(width: number, height: number, cellCount = TEMPLATE_PREVIEW_CELL_COUNT): number {
  const maxDim = Math.max(width, height)
  return Math.max(1, Math.round(maxDim / cellCount))
}

/** 100% 缩放时的 pixelUnitSize */
export function computePixelUnitSize(width: number, height: number): number {
  const maxDim = Math.max(width, height)
  if (maxDim <= 128) return Math.max(1, Math.floor(128 / maxDim))
  if (maxDim <= 256) return 2
  if (maxDim <= 512) return 1
  return 1
}

export function formatCanvasSizeLabel(width: number, height: number): string {
  return `${width}×${height}`
}

export function formatMappingCaption(width: number, height: number): string {
  const ratio = computeMappingRatio(width, height)
  return `${formatCanvasSizeLabel(width, height)} 1:${ratio}`
}

export type PixelTemplateCategory = 'square' | 'desktop' | 'mobile' | 'web'
export function computePreviewFramePercent(width: number, height: number): { width: string; height: string } {
  const aspect = width / height
  const maxPct = 72
  if (aspect >= 1) {
    return { width: `${maxPct}%`, height: `${maxPct / aspect}%` }
  }
  return { width: `${maxPct * aspect}%`, height: `${maxPct}%` }
}

/**
 * 向导预览缩放：仅按容器 fit，上限 1（画布像素 1:1 显示）。
 * 像素比率不参与画布尺寸，只影响网格步进。
 */
export function computePreviewFitScale(
  docWidth: number,
  docHeight: number,
  maxWidth: number,
  maxHeight: number
): number {
  const w = Math.max(1, Math.floor(docWidth))
  const h = Math.max(1, Math.floor(docHeight))
  const scale = Math.min(maxWidth / w, maxHeight / h, 1)
  if (!Number.isFinite(scale) || scale <= 0) return 1
  return scale
}

/** 向导预览网格步进（画布像素）：1:N 表示每 N×N 画布像素为一格 */
export function computeWizardPreviewGridStep(pixelRatio: number): number {
  return Math.max(1, Math.floor(pixelRatio))
}

export function findTemplateBySize(width: number, height: number): PixelCanvasTemplate | undefined {
  return PIXEL_CANVAS_TEMPLATES.find((t) => t.width === width && t.height === height)
}

export function templateDisplayLabel(template: PixelCanvasTemplate): string {
  return template.label ?? formatCanvasSizeLabel(template.width, template.height)
}
