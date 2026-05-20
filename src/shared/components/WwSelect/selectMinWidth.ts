/** 估算标签文本宽度（px，按 0.8125rem 字号） */
function measureLabelPx(label: string): number {
  let w = 0
  for (const ch of label) {
    const code = ch.charCodeAt(0)
    if (code > 255) w += 13
    else if (ch === ' ') w += 3.5
    else w += 7.5
  }
  return w
}

/** 根据选项最长 label 计算下拉最小宽度（含内边距与箭头区） */
export function minWidthForSelectOptions(
  options: unknown[],
  optionLabel = 'label',
  extraRem = 0.625
): string {
  const key = optionLabel
  let maxPx = 0
  for (const opt of options) {
    const label =
      opt !== null && typeof opt === 'object' && key in (opt as object)
        ? String((opt as Record<string, unknown>)[key])
        : String(opt)
    maxPx = Math.max(maxPx, measureLabelPx(label))
  }
  const chromeRem = 3.375
  const widthRem = maxPx / 16 + chromeRem + extraRem
  return `${Math.max(widthRem, 8.75).toFixed(3)}rem`
}
