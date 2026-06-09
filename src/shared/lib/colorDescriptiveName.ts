import { hsvaToParsed, parseColorToHsva, rgbToHsl, type HsvaColor } from '@shared/lib/colorWithAlpha'

/** HSL 锚点与中文色名 */
const NAMED_COLORS: ReadonlyArray<{ name: string; h: number; s: number; l: number }> = [
  { name: '樱桃红', h: 0, s: 78, l: 52 },
  { name: '正红', h: 0, s: 88, l: 46 },
  { name: '酒红', h: 350, s: 70, l: 38 },
  { name: '玫瑰红', h: 345, s: 72, l: 58 },
  { name: '珊瑚红', h: 12, s: 82, l: 62 },
  { name: '西瓜红', h: 6, s: 85, l: 55 },
  { name: '砖红', h: 15, s: 68, l: 45 },
  { name: '铁锈红', h: 18, s: 62, l: 40 },
  { name: '橘红', h: 22, s: 88, l: 52 },
  { name: '橘黄', h: 32, s: 92, l: 56 },
  { name: '琥珀色', h: 38, s: 90, l: 50 },
  { name: '杏色', h: 28, s: 78, l: 72 },
  { name: '蜜桃色', h: 20, s: 70, l: 78 },
  { name: '南瓜橙', h: 28, s: 85, l: 48 },
  { name: '金橙', h: 35, s: 95, l: 52 },
  { name: '柠檬黄', h: 54, s: 92, l: 58 },
  { name: '金黄', h: 45, s: 95, l: 50 },
  { name: '香槟金', h: 42, s: 55, l: 78 },
  { name: '奶油黄', h: 48, s: 65, l: 82 },
  { name: '芥末黄', h: 52, s: 72, l: 42 },
  { name: '草绿', h: 115, s: 55, l: 48 },
  { name: '苹果绿', h: 105, s: 62, l: 52 },
  { name: '薄荷绿', h: 155, s: 48, l: 58 },
  { name: '祖母绿', h: 145, s: 65, l: 38 },
  { name: '翡翠绿', h: 158, s: 72, l: 42 },
  { name: '松石绿', h: 168, s: 58, l: 48 },
  { name: '橄榄绿', h: 78, s: 42, l: 38 },
  { name: '森林绿', h: 130, s: 55, l: 28 },
  { name: '青柠', h: 85, s: 78, l: 52 },
  { name: '天青', h: 185, s: 55, l: 52 },
  { name: '孔雀蓝', h: 192, s: 68, l: 40 },
  { name: '宝石蓝', h: 215, s: 78, l: 48 },
  { name: '钴蓝', h: 225, s: 72, l: 42 },
  { name: '天蓝', h: 205, s: 82, l: 58 },
  { name: '晴空蓝', h: 200, s: 75, l: 68 },
  { name: '湖蓝', h: 195, s: 65, l: 55 },
  { name: '普鲁士蓝', h: 210, s: 55, l: 32 },
  { name: '靛青', h: 235, s: 62, l: 38 },
  { name: '海军蓝', h: 225, s: 58, l: 28 },
  { name: '紫罗兰', h: 275, s: 55, l: 58 },
  { name: '薰衣草', h: 265, s: 48, l: 72 },
  { name: '梅子紫', h: 290, s: 52, l: 42 },
  { name: '葡萄紫', h: 280, s: 65, l: 38 },
  { name: '丁香紫', h: 285, s: 42, l: 68 },
  { name: '洋红', h: 320, s: 85, l: 52 },
  { name: '品红', h: 330, s: 90, l: 48 },
  { name: '桃粉', h: 340, s: 65, l: 75 },
  { name: '樱花粉', h: 350, s: 55, l: 82 },
  { name: '裸粉', h: 18, s: 35, l: 78 },
  { name: '可可棕', h: 25, s: 38, l: 32 },
  { name: '咖啡棕', h: 28, s: 42, l: 28 },
  { name: '焦糖棕', h: 32, s: 55, l: 38 },
  { name: '栗棕', h: 20, s: 48, l: 26 },
  { name: '米白', h: 45, s: 18, l: 92 },
  { name: '象牙白', h: 48, s: 12, l: 95 },
  { name: '雪白', h: 210, s: 8, l: 98 },
  { name: '银灰', h: 220, s: 6, l: 78 },
  { name: '浅灰', h: 220, s: 5, l: 72 },
  { name: '中灰', h: 220, s: 4, l: 52 },
  { name: '炭灰', h: 220, s: 5, l: 32 },
  { name: '墨黑', h: 220, s: 8, l: 12 },
  { name: '纯黑', h: 0, s: 0, l: 4 }
]

const GRAY_NAMES: ReadonlyArray<{ name: string; l: number }> = [
  { name: '纯白', l: 98 },
  { name: '雪白', l: 95 },
  { name: '米白', l: 90 },
  { name: '浅灰', l: 78 },
  { name: '银灰', l: 68 },
  { name: '中灰', l: 52 },
  { name: '深灰', l: 38 },
  { name: '炭灰', l: 24 },
  { name: '墨黑', l: 12 },
  { name: '纯黑', l: 4 }
]

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

function nearestNamedColor(h: number, s: number, l: number): string {
  if (s < 10) {
    let best = GRAY_NAMES[0].name
    let bestD = Infinity
    for (const g of GRAY_NAMES) {
      const d = Math.abs(l - g.l)
      if (d < bestD) {
        bestD = d
        best = g.name
      }
    }
    return best
  }

  let best = NAMED_COLORS[0].name
  let bestScore = Infinity
  for (const c of NAMED_COLORS) {
    const dh = hueDistance(h, c.h)
    const ds = Math.abs(s - c.s)
    const dl = Math.abs(l - c.l)
    const score = dh * 1.4 + ds * 0.85 + dl * 0.65
    if (score < bestScore) {
      bestScore = score
      best = c.name
    }
  }
  return best
}

/** 根据 HSVA 返回中文颜色描述 */
export function describeColor(hsva: HsvaColor): string {
  if (hsva.a <= 0.04) return '完全透明'

  const c = hsvaToParsed(hsva)
  const { h, s, l } = rgbToHsl(c.r, c.g, c.b)
  const base = nearestNamedColor(h, s, l)

  if (hsva.a < 0.35) return `半透明${base}`
  if (hsva.a < 0.72) return `轻透${base}`
  return base
}

/** 从任意颜色字符串获取中文描述 */
export function describeColorString(input: string | null | undefined): string {
  return describeColor(parseColorToHsva(input))
}
