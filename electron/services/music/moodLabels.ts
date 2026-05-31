import type { MusicMoodCategory } from '../../../src/shared/types/music'

/** 心情分类标题本地化 */
const MOOD_LABELS: Record<string, string> = {
  focus: '专注',
  workout: '健身',
  relax: '放松',
  sleep: '睡眠',
  party: '派对',
  romance: '浪漫',
  sad: '伤感',
  happy: '快乐',
  chill: '放松',
  pop: '流行',
  rock: '摇滚',
  jazz: '爵士',
  classical: '古典',
  electronic: '电子',
  hiphop: '嘻哈',
  country: '乡村',
  indie: '独立',
  metal: '金属',
  blues: '布鲁斯',
  folk: '民谣',
  soul: '灵魂',
  rnb: 'R&B',
  reggae: '雷鬼',
  punk: '朋克',
  latin: '拉丁',
  kpop: '韩语流行',
  jpop: '日语流行',
  mandopop: '华语流行',
  cantopop: '粤语流行',
  chinese: '华语',
  acoustic: '原声',
  ambient: '氛围',
  anime: '动漫',
  bollywood: '宝莱坞',
  children: '亲子',
  christian: '福音',
  coding: '编程',
  commute: '通勤',
  cooking: '烹饪',
  dance: '舞曲',
  dinner: '晚餐',
  energy: '能量',
  feelgood: 'Feel Good',
  gaming: '游戏',
  holidays: '节日',
  homedecor: '居家',
  kids: '亲子',
  love: '爱情',
  motivation: '激励',
  nature: '自然',
  nostalgia: '怀旧',
  roadtrip: '公路旅行',
  spring: '春天',
  summer: '夏天',
  autumn: '秋天',
  winter: '冬天',
  study: '学习',
  travel: '旅行',
  uplifting: '振奋',
  wedding: '婚礼',
  yoga: '瑜伽',
  华语: '华语',
  流行: '流行',
  摇滚: '摇滚',
  电子: '电子',
  古典: '古典',
  爵士: '爵士',
  民谣: '民谣',
  轻音乐: '轻音乐',
  睡眠: '睡眠',
  运动: '运动',
  放松: '放松',
  派对: '派对',
  浪漫: '浪漫',
  伤感: '伤感',
  快乐: '快乐',
  专注: '专注',
  健身: '健身',
  通勤: '通勤',
  怀旧: '怀旧',
  经典: '经典',
  热歌: '热歌'
}

const MOOD_PHRASES: Array<[RegExp, string]> = [
  [/feel\s*good/i, 'Feel Good'],
  [/road\s*trip/i, '公路旅行'],
  [/home\s*decor/i, '居家'],
  [/hip\s*hop/i, '嘻哈'],
  [/r\s*&\s*b/i, 'R&B'],
  [/k[\s-]?pop/i, '韩语流行'],
  [/j[\s-]?pop/i, '日语流行'],
  [/mandopop|mando\s*pop|c[\s-]?pop/i, '华语流行'],
  [/cantopop|cantonese/i, '粤语流行']
]

/** Verome 分类不可用时的中文兜底 */
export const CHINESE_MOOD_FALLBACK: MusicMoodCategory[] = [
  { id: '华语流行', title: '华语流行' },
  { id: '经典老歌', title: '经典老歌' },
  { id: '抖音热歌', title: '抖音热歌' },
  { id: '伤感', title: '伤感' },
  { id: '放松', title: '放松' },
  { id: '睡眠', title: '睡眠' },
  { id: '健身', title: '健身' },
  { id: '派对', title: '派对' }
]

export function localizeMoodTitle(title: string): string {
  const raw = title.trim()
  if (!raw) return raw
  if (/[\u4e00-\u9fff]/.test(raw)) return raw

  for (const [pattern, label] of MOOD_PHRASES) {
    if (pattern.test(raw)) return label
  }

  const key = raw.toLowerCase().replace(/[\s_-]+/g, '')
  if (MOOD_LABELS[key]) return MOOD_LABELS[key]!
  if (MOOD_LABELS[raw]) return MOOD_LABELS[raw]!

  const words = raw.split(/[\s/&-]+/).filter(Boolean)
  if (words.length > 1) {
    const localized = words.map((w) => MOOD_LABELS[w.toLowerCase()] ?? w)
    if (localized.some((w, i) => w !== words[i])) return localized.join(' ')
  }

  return raw
}
