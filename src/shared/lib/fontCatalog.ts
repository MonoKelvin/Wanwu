export type FontCatalogCategory = 'chinese' | 'english' | 'mono'

export interface FontCatalogEntry {
  value: string
  label: string
  category: FontCatalogCategory
}

export const FONT_CATEGORY_LABELS: Record<FontCatalogCategory, string> = {
  chinese: '中文',
  english: '英文',
  mono: '等宽'
}

/** 常用中英文字体候选（会与系统已安装字体取交集） */
export const FONT_CATALOG: FontCatalogEntry[] = [
  { value: 'Microsoft YaHei', label: '微软雅黑', category: 'chinese' },
  { value: 'Microsoft YaHei UI', label: '微软雅黑 UI', category: 'chinese' },
  { value: 'SimSun', label: '宋体', category: 'chinese' },
  { value: 'NSimSun', label: '新宋体', category: 'chinese' },
  { value: 'SimHei', label: '黑体', category: 'chinese' },
  { value: 'KaiTi', label: '楷体', category: 'chinese' },
  { value: 'FangSong', label: '仿宋', category: 'chinese' },
  { value: 'DengXian', label: '等线', category: 'chinese' },
  { value: 'STSong', label: '华文宋体', category: 'chinese' },
  { value: 'STKaiti', label: '华文楷体', category: 'chinese' },
  { value: 'STXihei', label: '华文细黑', category: 'chinese' },
  { value: 'STFangsong', label: '华文仿宋', category: 'chinese' },
  { value: 'Noto Sans SC', label: 'Noto Sans SC', category: 'chinese' },
  { value: 'Source Han Sans SC', label: '思源黑体', category: 'chinese' },
  { value: 'Source Han Serif SC', label: '思源宋体', category: 'chinese' },
  { value: 'PingFang SC', label: '苹方', category: 'chinese' },
  { value: 'Segoe UI', label: 'Segoe UI', category: 'english' },
  { value: 'Arial', label: 'Arial', category: 'english' },
  { value: 'Helvetica', label: 'Helvetica', category: 'english' },
  { value: 'Times New Roman', label: 'Times New Roman', category: 'english' },
  { value: 'Georgia', label: 'Georgia', category: 'english' },
  { value: 'Verdana', label: 'Verdana', category: 'english' },
  { value: 'Tahoma', label: 'Tahoma', category: 'english' },
  { value: 'Calibri', label: 'Calibri', category: 'english' },
  { value: 'Cambria', label: 'Cambria', category: 'english' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS', category: 'english' },
  { value: 'Consolas', label: 'Consolas', category: 'mono' },
  { value: 'Courier New', label: 'Courier New', category: 'mono' },
  { value: 'Cascadia Mono', label: 'Cascadia Mono', category: 'mono' },
  { value: 'Cascadia Code', label: 'Cascadia Code', category: 'mono' }
]

const catalogByValue = new Map(FONT_CATALOG.map((entry) => [entry.value.toLowerCase(), entry]))

export function fontCatalogLabel(family: string): string {
  const hit = catalogByValue.get(family.trim().toLowerCase())
  return hit?.label ?? family
}

export function cssFontFamilyStack(family: string): string {
  const trimmed = family.trim()
  if (!trimmed) return ''
  return trimmed.includes(' ') ? `"${trimmed}"` : trimmed
}
