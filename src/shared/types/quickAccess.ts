/** 全局唤起器 / 托盘 / 剪贴板联想 共用 */

export type QuickAccessHitKind = string

export interface QuickAccessHit {
  kind: QuickAccessHitKind
  id: string
  title: string
  subtitle: string | null
  /** 模块扩展数据（打开目标、展示元信息等） */
  payload?: Record<string, unknown>
}

/** 与 illustrated-handbook/domain/dailyPick 字段一致（IPC 线格式） */
export interface QuickAccessDailyPreview {
  id: string
  name: string
  summary: string | null
  categoryId: string
  categoryName: string
  coverPath: string | null
}

/** @deprecated 使用 QuickAccessDailyPreview */
export type DailyPickPreview = QuickAccessDailyPreview

export interface QuickAccessTrayStatus {
  daily: QuickAccessDailyPreview | null
  /** 各模块 getTrayStatusSlice 返回值，按 module id 索引 */
  slices: Record<string, Record<string, unknown>>
}

export interface QuickAccessOpenTarget {
  kind: QuickAccessHitKind
  id: string
  payload?: Record<string, unknown>
}

export interface ClipboardAssistPayload {
  query: string
  hits: QuickAccessHit[]
}

export function hitToOpenTarget(hit: QuickAccessHit): QuickAccessOpenTarget {
  return {
    kind: hit.kind,
    id: hit.id,
    payload: hit.payload ? { ...hit.payload } : undefined
  }
}

export function readQuickAccessPayload(
  target: Pick<QuickAccessOpenTarget, 'payload'>
): Record<string, unknown> {
  return target.payload ?? {}
}
