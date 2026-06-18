export const LEISURE_READ_MODULE_ID = 'wanwu.leisure-read'
export const LEISURE_READ_FETCH_TIMEOUT_MS = 8000

export type LeisureReadRiddleLang = 'zh' | 'en'
export type LeisureReadArticleMode = 'random' | 'today'
/** 急转弯揭晓前思考等待（秒）；0 表示不等待 */
export type LeisureReadRiddleThinkDelay = 0 | 5 | 10 | 30

export interface LeisureReadModuleSettings {
  riddleLang: LeisureReadRiddleLang
  articleMode: LeisureReadArticleMode
  riddleThinkDelay: LeisureReadRiddleThinkDelay
}

export const DEFAULT_LEISURE_READ_MODULE_SETTINGS: LeisureReadModuleSettings = {
  riddleLang: 'zh',
  articleMode: 'random',
  riddleThinkDelay: 5
}

function readRiddleLang(raw: Record<string, unknown> | undefined): LeisureReadRiddleLang {
  if (raw?.riddleLang === 'en') return 'en'
  if (raw?.riddleLang === 'zh') return 'zh'
  if (raw?.jokeLang === 'en') return 'en'
  return 'zh'
}

export function normalizeLeisureReadModuleSettings(
  raw: Record<string, unknown> | undefined
): LeisureReadModuleSettings {
  const delay = Number(raw?.riddleThinkDelay)
  const riddleThinkDelay: LeisureReadRiddleThinkDelay =
    delay === 0 || delay === 5 || delay === 10 || delay === 30 ? delay : 5

  return {
    riddleLang: readRiddleLang(raw),
    articleMode: raw?.articleMode === 'today' ? 'today' : 'random',
    riddleThinkDelay
  }
}

export function readLeisureReadModuleSettings(
  appSettings: Record<string, unknown>
): LeisureReadModuleSettings {
  const moduleSettings = appSettings.moduleSettings as Record<string, Record<string, unknown>> | undefined
  const stored = moduleSettings?.[LEISURE_READ_MODULE_ID]
  if (stored) return normalizeLeisureReadModuleSettings(stored)

  if ('leisureReadJokeLang' in appSettings || 'leisureReadArticleMode' in appSettings) {
    return normalizeLeisureReadModuleSettings({
      jokeLang: appSettings.leisureReadJokeLang,
      articleMode: appSettings.leisureReadArticleMode
    })
  }

  return { ...DEFAULT_LEISURE_READ_MODULE_SETTINGS }
}

export const LEISURE_READ_RIDDLE_LANG_OPTIONS: Array<{ label: string; value: LeisureReadRiddleLang }> = [
  { label: '中文', value: 'zh' },
  { label: 'English', value: 'en' }
]

export const LEISURE_READ_ARTICLE_MODE_OPTIONS: Array<{
  label: string
  value: LeisureReadArticleMode
}> = [
  { label: '随机', value: 'random' },
  { label: '今日', value: 'today' }
]

export const LEISURE_READ_RIDDLE_THINK_OPTIONS: Array<{
  label: string
  value: LeisureReadRiddleThinkDelay
}> = [
  { label: '不等待', value: 0 },
  { label: '5 秒', value: 5 },
  { label: '10 秒', value: 10 },
  { label: '30 秒', value: 30 }
]

export const LEISURE_READ_TAB_LABELS: Record<
  import('./types').LeisureReadTabId,
  string
> = {
  quote: '每日一言',
  joke: '冷笑话',
  riddle: '脑筋急转弯',
  article: '每日一文'
}
