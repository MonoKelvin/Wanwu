/** 一天中的时段，用于筛选「早安 / 晚安」类提示 */
export type NotePlaceholderTimeSlot =
  | 'morning'
  | 'forenoon'
  | 'noon'
  | 'afternoon'
  | 'evening'
  | 'night'

/** 预留：与天气服务对齐的标签，如 rain、sunny、hot */
export type NotePlaceholderWeatherTag = string

export interface NotePlaceholderHint {
  id: string
  text: string
  /**
   * 允许展示的时段；省略表示全天可用。
   * 例：早安仅 morning；晚安用 evening + night。
   */
  timeSlots?: NotePlaceholderTimeSlot[]
  /**
   * 预留：需命中至少一个天气标签才展示。
   * 未传 weatherTags 的条目不受天气过滤。
   */
  weatherTags?: NotePlaceholderWeatherTag[]
  /** 加权随机权重，默认 1 */
  weight?: number
}

export interface PickNotePlaceholderContext {
  now?: Date
  /** 预留：当前天气标签，由上层注入 */
  weatherTags?: NotePlaceholderWeatherTag[]
}
