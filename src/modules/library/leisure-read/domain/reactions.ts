/** 冷笑话互动气泡文案池 */

export const JOKE_COLD_BUBBLES = [
  '有被冷到',
  '好冷呀',
  '冷到发抖',
  '冻住了',
  '寒气逼人',
  '冰雕本雕',
  '冷笑话认证',
  '空调省了',
  '鸡皮疙瘩起来了',
  '这梗太冷了',
  '冷场预警',
  '冬天来了',
  '瑟瑟发抖',
  '冷到结冰',
  '冰爽一下',
  '冷风过境',
  '温度骤降',
  '冷到捂脸',
  '冻成狗了',
  '冷到灵魂'
] as const

export const JOKE_FLAT_BUBBLES = [
  '毫无波澜',
  '内心平静',
  '面无表情',
  '已免疫',
  '无感',
  '沉默是金',
  '下一个更好',
  '告辞',
  'NONONO',
  '没意思',
  '不好笑',
  '尬住了',
  '翻白眼',
  '这梗太硬了',
  '我拒绝',
  '冷场了',
  '石化中',
  '已读不回',
  '心如止水',
  '波澜不惊'
] as const

export type JokeReactionKind = 'cold' | 'flat'

export function pickBubble(pool: readonly string[]) {
  return pool[Math.floor(Math.random() * pool.length)]!
}
