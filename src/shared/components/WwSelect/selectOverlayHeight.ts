/** 下拉列表高度：按选项数估算，避免 Prime 默认 14rem 撑出空白 */

export const SELECT_ROW_REM = 2
export const SELECT_GAP_REM = 0.0625
export const SELECT_PANEL_INSET_REM = 0.3125
export const SELECT_PANEL_PAD_REM = SELECT_PANEL_INSET_REM * 2
export const SELECT_HEIGHT_BUFFER_REM = 0.25
export const SELECT_MAX_HEIGHT_REM = 14

export function scrollHeightForSelectOptions(count: number): string {
  if (count <= 0) {
    return `${SELECT_ROW_REM + SELECT_PANEL_PAD_REM + SELECT_HEIGHT_BUFFER_REM}rem`
  }
  const gaps = Math.max(0, count - 1) * SELECT_GAP_REM
  const h = Math.min(
    count * SELECT_ROW_REM + gaps + SELECT_PANEL_PAD_REM + SELECT_HEIGHT_BUFFER_REM,
    SELECT_MAX_HEIGHT_REM
  )
  return `${Math.max(h, SELECT_ROW_REM + SELECT_PANEL_PAD_REM).toFixed(3)}rem`
}

/** 选项过多、需要滚动时才显示滚动条 */
export function selectListNeedsScroll(count: number): boolean {
  if (count <= 0) return false
  const gaps = Math.max(0, count - 1) * SELECT_GAP_REM
  const content =
    count * SELECT_ROW_REM + gaps + SELECT_PANEL_PAD_REM + SELECT_HEIGHT_BUFFER_REM
  return content > SELECT_MAX_HEIGHT_REM
}
