/** 估算标签文本宽度（px，按 0.8125rem 字号） */
export function measureLabelPx(label: string): number {
  let w = 0
  for (const ch of label) {
    const code = ch.charCodeAt(0)
    if (code > 255) w += 13
    else if (ch === ' ') w += 3.5
    else w += 7.5
  }
  return w
}

function optionLabelText(opt: unknown, optionLabel: string): string {
  const key = optionLabel
  if (opt !== null && typeof opt === 'object' && key in (opt as object)) {
    return String((opt as Record<string, unknown>)[key])
  }
  return String(opt)
}

/** 选项列表中最长 label 的估算宽度（px） */
export function maxOptionLabelWidthPx(options: unknown[], optionLabel = 'label'): number {
  let maxPx = 0
  for (const opt of options) {
    maxPx = Math.max(maxPx, measureLabelPx(optionLabelText(opt, optionLabel)))
  }
  return maxPx
}

/** 面板相对选项文本的左右留白（panel padding + option inset） */
export const SELECT_PANEL_CHROME_X_PX = 28

/** 触发器 min-width：仅用于非 block、需在控件上容纳最长选项时 */
export function minWidthRemForSelectTrigger(
  options: unknown[],
  optionLabel = 'label',
  extraRem = 0.625
): string {
  const maxPx = maxOptionLabelWidthPx(options, optionLabel)
  const chromeRem = 3.375
  const widthRem = maxPx / 16 + chromeRem + extraRem
  return `${Math.max(widthRem, 8.75).toFixed(3)}rem`
}

const VIEWPORT_EDGE_MARGIN_PX = 16

/**
 * 面板允许的最大宽度：不超过视口，且在对话框内时不超出对话框内容区。
 */
export function getPanelMaxWidthPx(anchorEl: HTMLElement): number {
  const vwCap = Math.max(160, window.innerWidth - VIEWPORT_EDGE_MARGIN_PX * 2)
  const dialog = anchorEl.closest('.p-dialog') as HTMLElement | null
  if (!dialog) return vwCap

  const dialogW = dialog.getBoundingClientRect().width
  const dialogCap = Math.max(anchorEl.getBoundingClientRect().width, dialogW - VIEWPORT_EDGE_MARGIN_PX * 2)
  return Math.min(vwCap, dialogCap)
}

export type ResolvedSelectPanelWidth = {
  widthPx: number
  maxWidthPx: number
  /** 自然所需宽度超过 max 时需省略号 */
  needsEllipsis: boolean
}

/**
 * 下拉面板宽度：
 * 1. 默认与触发器同宽
 * 2. 仅当选项内容更宽时放大
 * 3. 不超过 maxWidthPx（视口 / 对话框）
 */
export function resolveSelectPanelWidthPx(args: {
  triggerWidthPx: number
  options: unknown[]
  optionLabel?: string
  maxWidthPx: number
}): ResolvedSelectPanelWidth {
  const triggerWidthPx = Math.max(1, Math.ceil(args.triggerWidthPx))
  const maxWidthPx = Math.max(triggerWidthPx, Math.ceil(args.maxWidthPx))
  const contentWidthPx =
    maxOptionLabelWidthPx(args.options, args.optionLabel ?? 'label') + SELECT_PANEL_CHROME_X_PX
  const naturalWidthPx = Math.max(triggerWidthPx, contentWidthPx)
  const widthPx = Math.min(naturalWidthPx, maxWidthPx)
  return {
    widthPx,
    maxWidthPx,
    needsEllipsis: naturalWidthPx > maxWidthPx
  }
}

/** 下拉面板 inline style（在 overlay 显示前写入，避免先窄后宽闪烁） */
export function buildPanelOverlayStyle(args: {
  triggerWidthPx: number
  options: unknown[]
  optionLabel?: string
  anchorEl: HTMLElement
}): { style: Record<string, string>; needsEllipsis: boolean } {
  const triggerWidthPx = Math.max(1, Math.ceil(args.triggerWidthPx))
  const resolved = resolveSelectPanelWidthPx({
    triggerWidthPx,
    options: args.options,
    optionLabel: args.optionLabel,
    maxWidthPx: getPanelMaxWidthPx(args.anchorEl)
  })
  return {
    needsEllipsis: resolved.needsEllipsis,
    style: {
      width: `${resolved.widthPx}px`,
      minWidth: `${triggerWidthPx}px`,
      maxWidth: `${resolved.maxWidthPx}px`,
      '--ww-select-panel-w': `${resolved.widthPx}px`,
      '--ww-select-panel-max-w': `${resolved.maxWidthPx}px`
    }
  }
}
