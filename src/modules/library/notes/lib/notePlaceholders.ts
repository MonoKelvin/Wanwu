/**
 * 便笺正文占位提示：类型、时段解析与加权随机选取。
 * 提示文案库见 notePlaceholderHints.ts。
 */
import { NOTE_PLACEHOLDER_HINTS } from '@modules/library/notes/lib/notePlaceholderHints'

export type NotePlaceholderTimeSlot =
  | 'morning'
  | 'forenoon'
  | 'noon'
  | 'afternoon'
  | 'evening'
  | 'night'

export type NotePlaceholderWeatherTag = string

export interface NotePlaceholderHint {
  id: string
  text: string
  timeSlots?: NotePlaceholderTimeSlot[]
  weatherTags?: NotePlaceholderWeatherTag[]
  weight?: number
}

export interface PickNotePlaceholderContext {
  now?: Date
  weatherTags?: NotePlaceholderWeatherTag[]
}

const FALLBACK_TEXT = '开始记录…'
const runtimeHints: NotePlaceholderHint[] = []

export function registerNotePlaceholderHints(hints: NotePlaceholderHint[]): void {
  runtimeHints.push(...hints)
}

export function clearRuntimeNotePlaceholderHints(): void {
  runtimeHints.length = 0
}

export function resolveNotePlaceholderTimeSlot(date: Date): NotePlaceholderTimeSlot {
  const hour = date.getHours()
  if (hour >= 5 && hour < 9) return 'morning'
  if (hour >= 9 && hour < 11) return 'forenoon'
  if (hour >= 11 && hour < 13) return 'noon'
  if (hour >= 13 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'night'
}

function allHints(): NotePlaceholderHint[] {
  return [...NOTE_PLACEHOLDER_HINTS, ...runtimeHints]
}

function matchesTimeSlot(hint: NotePlaceholderHint, slot: NotePlaceholderTimeSlot): boolean {
  if (!hint.timeSlots?.length) return true
  return hint.timeSlots.includes(slot)
}

function matchesWeather(hint: NotePlaceholderHint, weatherTags: string[] | undefined): boolean {
  if (!hint.weatherTags?.length) return true
  if (!weatherTags?.length) return false
  return hint.weatherTags.some((tag) => weatherTags.includes(tag))
}

function filterCandidates(
  hints: NotePlaceholderHint[],
  slot: NotePlaceholderTimeSlot,
  weatherTags: string[] | undefined
): NotePlaceholderHint[] {
  return hints.filter(
    (hint) => matchesTimeSlot(hint, slot) && matchesWeather(hint, weatherTags)
  )
}

function weightedPick(hints: NotePlaceholderHint[]): NotePlaceholderHint {
  const total = hints.reduce((sum, hint) => sum + (hint.weight ?? 1), 0)
  let roll = Math.random() * total
  for (const hint of hints) {
    roll -= hint.weight ?? 1
    if (roll <= 0) return hint
  }
  return hints[hints.length - 1]!
}

/** 按时段、天气（可选）筛选后加权随机选取一条正文占位提示 */
export function pickNotePlaceholder(ctx: PickNotePlaceholderContext = {}): string {
  const now = ctx.now ?? new Date()
  const slot = resolveNotePlaceholderTimeSlot(now)
  const weatherTags = ctx.weatherTags
  const pool = allHints()

  let candidates = filterCandidates(pool, slot, weatherTags)
  if (!candidates.length) {
    candidates = filterCandidates(pool, slot, undefined).filter((hint) => !hint.weatherTags?.length)
  }
  if (!candidates.length) {
    candidates = pool.filter((hint) => !hint.timeSlots?.length && !hint.weatherTags?.length)
  }
  if (!candidates.length) return FALLBACK_TEXT
  return weightedPick(candidates).text
}
