export interface ColorPaletteGroup {
  id: string
  name: string
  colors: string[]
  builtin?: boolean
}

export const GLOBAL_PALETTE_MODULE_ID = 'wanwu.global-palettes'

export const BUILTIN_PALETTE_GROUPS: ColorPaletteGroup[] = [
  {
    id: 'basic',
    name: '基础',
    builtin: true,
    colors: ['#000000', '#FFFFFF', '#808080', '#C0C0C0', '#FF0000', '#00FF00', '#0000FF', '#FFFF00']
  },
  {
    id: 'pixel-default',
    name: '像素默认',
    builtin: true,
    colors: ['#000000', '#FFFFFF', '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA']
  },
  {
    id: 'retro',
    name: '复古 16 色',
    builtin: true,
    colors: [
      '#1a1c2c',
      '#5d275d',
      '#b13e53',
      '#ef7d57',
      '#ffcd75',
      '#a7f070',
      '#38b764',
      '#257179',
      '#29366f',
      '#3b5dc9',
      '#41a6f6',
      '#73eff7',
      '#f4f4f4',
      '#94b0c2',
      '#566c86',
      '#333c57'
    ]
  },
  {
    id: 'warm',
    name: '暖色',
    builtin: true,
    colors: ['#2D1B0E', '#5C3317', '#8B4513', '#CD853F', '#F4A460', '#FFDAB9', '#FF6347', '#FF4500']
  },
  {
    id: 'cool',
    name: '冷色',
    builtin: true,
    colors: ['#0B132B', '#1C2541', '#3A506B', '#5BC0BE', '#6FFFE9', '#1B4965', '#62B6CB', '#BEE9E8']
  }
]

export function normalizePaletteGroups(raw: unknown): ColorPaletteGroup[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const o = item as Record<string, unknown>
      const id = String(o.id ?? '')
      const name = String(o.name ?? '')
      const colors = Array.isArray(o.colors) ? o.colors.map(String) : []
      if (!id || !name || !colors.length) return null
      return { id, name, colors, builtin: Boolean(o.builtin) } satisfies ColorPaletteGroup
    })
    .filter((g): g is ColorPaletteGroup => g !== null)
}

export function mergePaletteGroups(custom: ColorPaletteGroup[]): ColorPaletteGroup[] {
  const customIds = new Set(custom.map((g) => g.id))
  const builtins = BUILTIN_PALETTE_GROUPS.filter((g) => !customIds.has(g.id))
  return [...builtins, ...custom]
}
