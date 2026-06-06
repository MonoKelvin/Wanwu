/** 图元缩放控制点样式（适配深浅主题） */
export function diagramResizeControlStyle(): {
  width: number
  height: number
  fill: string
  stroke: string
} {
  const isDark = document.documentElement.dataset.theme === 'dark'
  return {
    width: 6,
    height: 6,
    fill: isDark ? '#2a2a2e' : '#ffffff',
    stroke: isDark ? '#6a6a72' : '#8a8a92'
  }
}
