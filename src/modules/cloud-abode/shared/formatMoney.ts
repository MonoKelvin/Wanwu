/** 分 → 元，保留两位小数 */
export function formatCny(cents: number): string {
  return (cents / 100).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export const CATEGORY_LABELS: Record<string, string> = {
  VEHICLE: '跑车',
  FURNITURE: '家具',
  PLANT: '绿植',
  PET: '宠物',
  ILLUSTRATION: '立绘',
  OTHER: '其他'
}

export const LEDGER_TYPE_LABELS: Record<string, string> = {
  initial_grant: '启动资金',
  todo_reward: '任务奖励',
  tool_reward: '工具奖励',
  purchase: '购买',
  refund: '退款',
  punishment: '惩罚'
}
