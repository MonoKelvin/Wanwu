/** 系统每日 TODO 随机池 */
export const SYSTEM_TODO_POOL: Array<{
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  rewardCents: number
}> = [
  {
    title: '浏览云斋商城',
    description: '查看至少 3 件商品并了解参考市价',
    priority: 'low',
    rewardCents: 200
  },
  {
    title: '使用一个小工具',
    description: '在工具页体验任意内置工具',
    priority: 'low',
    rewardCents: 150
  },
  {
    title: '查看 SU7 展车',
    description: '进入展车页浏览 3D 展厅',
    priority: 'medium',
    rewardCents: 300
  },
  {
    title: '整理今日收支',
    description: '打开账本查看最近流水',
    priority: 'low',
    rewardCents: 100
  },
  {
    title: '完成一笔虚拟思考',
    description: '规划下一笔想购买的商品',
    priority: 'medium',
    rewardCents: 250
  },
  {
    title: '绑定模拟银行卡',
    description: '在账本页添加一张模拟银行卡（可选）',
    priority: 'low',
    rewardCents: 500
  }
]

const RIDDLES = [
  '什么东西越洗越脏？答案：水。',
  '什么门永远关不上？答案：球门。',
  '什么书买不到？答案：秘书。',
  '云斋版：虚拟货币叫什么？答案：与人民币 1:1 的「元」。'
]

export function randomRiddle(): string {
  return RIDDLES[Math.floor(Math.random() * RIDDLES.length)]!
}
