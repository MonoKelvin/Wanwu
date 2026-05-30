/** 云斋策略：等级、惩罚、定价、奖励限制 */

export const INITIAL_BALANCE_CENTS = 50_000 // 500 元

export const LEVEL_THRESHOLDS_CENTS = [0, 5_000_00, 50_000_00, 500_000_00, 5_000_000_00]

export interface LevelLimits {
  dailyBonusCapCents: number
  todoMax: number
  toolRewardMultiplier: number
  punishmentMultiplier: number
  plants: number
  pets: number
  vehicles: number
}

export function computeLevel(totalAssetsCents: number): number {
  let level = 1
  for (let i = LEVEL_THRESHOLDS_CENTS.length - 1; i >= 0; i--) {
    if (totalAssetsCents >= LEVEL_THRESHOLDS_CENTS[i]!) {
      level = i + 1
      break
    }
  }
  return Math.min(level, 5)
}

export function getLevelLimits(level: number): LevelLimits {
  const table: LevelLimits[] = [
    {
      dailyBonusCapCents: 500,
      todoMax: 5,
      toolRewardMultiplier: 1,
      punishmentMultiplier: 0.5,
      plants: 3,
      pets: 2,
      vehicles: 10
    },
    {
      dailyBonusCapCents: 1_000,
      todoMax: 8,
      toolRewardMultiplier: 1,
      punishmentMultiplier: 0.75,
      plants: 4,
      pets: 2,
      vehicles: 15
    },
    {
      dailyBonusCapCents: 2_000,
      todoMax: 10,
      toolRewardMultiplier: 1.1,
      punishmentMultiplier: 1,
      plants: 5,
      pets: 3,
      vehicles: 20
    },
    {
      dailyBonusCapCents: 3_000,
      todoMax: 12,
      toolRewardMultiplier: 1.2,
      punishmentMultiplier: 1.25,
      plants: 6,
      pets: 4,
      vehicles: 25
    },
    {
      dailyBonusCapCents: 5_000,
      todoMax: 15,
      toolRewardMultiplier: 1.3,
      punishmentMultiplier: 1.5,
      plants: 8,
      pets: 5,
      vehicles: 30
    }
  ]
  return table[Math.min(Math.max(level, 1), 5) - 1]!
}

export function scalePunishment(baseCents: number, level: number): number {
  const limits = getLevelLimits(level)
  return Math.round(baseCents * limits.punishmentMultiplier)
}

export function weatherCapCents(balanceCents: number): number {
  return Math.min(Math.round(balanceCents * 0.02), 5_000)
}

const CATEGORY_PRICE_RANGES: Record<string, [number, number]> = {
  FURNITURE: [10_00, 500_000_00],
  VEHICLE: [50_000_00, 500_000_000_00],
  PLANT: [5_00, 50_000_00],
  PET: [10_00, 100_000_00],
  ILLUSTRATION: [0, 10_000_00],
  OTHER: [1_00, 1_000_000_00]
}

export function autoPriceCents(
  category: string,
  comparablePrices: number[]
): { priceCents: number; confidence: number; explanation: string[] } {
  const explanation: string[] = []
  let priceCents: number
  let confidence = 0.5

  if (comparablePrices.length > 0) {
    const sorted = [...comparablePrices].sort((a, b) => a - b)
    const mid = sorted[Math.floor(sorted.length / 2)]!
    priceCents = mid
    confidence = 0.85
    explanation.push(`参考同类商品中位价 ${(mid / 100).toFixed(2)} 元`)
  } else {
    const range = CATEGORY_PRICE_RANGES[category] ?? CATEGORY_PRICE_RANGES.OTHER!
    priceCents = Math.round((range[0] + range[1]) / 2)
    confidence = 0.4
    explanation.push(`无同类参考，使用类目默认区间中值`)
  }

  const range = CATEGORY_PRICE_RANGES[category] ?? CATEGORY_PRICE_RANGES.OTHER!
  priceCents = Math.max(range[0], Math.min(range[1], priceCents))

  return { priceCents, confidence, explanation }
}

export function toolRewardCents(toolId: string, level: number): number {
  const base: Record<string, number> = {
    kana: 50,
    joke: 30,
    'daily-poem': 40,
    word: 35,
    pandoc: 100,
    riddle: 30
  }
  const limits = getLevelLimits(level)
  return Math.round((base[toolId] ?? 25) * limits.toolRewardMultiplier)
}
