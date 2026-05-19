import type { ShareCardTemplateMeta } from './types'

export const SHARE_CARD_TEMPLATES: ShareCardTemplateMeta[] = [
  {
    id: 'classic',
    label: '经典',
    description: '杂志封面风格，下方自然过渡到文字区，稳重耐看，适合大多数物品。'
  },
  {
    id: 'center',
    label: '居中',
    description: '标题、简介与特点整体垂直居中叠在封面上，可自定义字体、字号与文字颜色。'
  },
  {
    id: 'corner',
    label: '边角',
    description: '标题、特点、简介分落四角，中间大面积留白，杂志感强、不抢封面。'
  },
  {
    id: 'vivid',
    label: '活跃',
    description: '左侧强调线搭配醒目标题，版面简洁有力，适合想突出名称的物品。'
  },
  {
    id: 'cinema',
    label: '电影',
    description: '暗角氛围加居中大片名，像电影海报，适合有故事感、氛围感强的封面。'
  },
  {
    id: 'minimal',
    label: '极简',
    description: '大图留白，顶部标题、底部一行简介，干净克制，适合想突出画面的物品。'
  },
  {
    id: 'split',
    label: '分栏',
    description: '上图下文分栏排版，信息区独立清晰，像产品详情页，适合规格较多的物品。'
  }
]

export const DEFAULT_SHARE_CARD_TEMPLATE = SHARE_CARD_TEMPLATES[0].id
