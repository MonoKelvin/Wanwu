export const LEISURE_READ_MODULE_ID = 'wanwu.leisure-read'
export const LEISURE_READ_FETCH_TIMEOUT_MS = 8000

export type LeisureReadJokeLang = 'zh' | 'en'
export type LeisureReadArticleMode = 'random' | 'today'

export interface LeisureReadModuleSettings {
  jokeLang: LeisureReadJokeLang
  articleMode: LeisureReadArticleMode
}

export const DEFAULT_LEISURE_READ_MODULE_SETTINGS: LeisureReadModuleSettings = {
  jokeLang: 'zh',
  articleMode: 'random'
}

export function normalizeLeisureReadModuleSettings(
  raw: Record<string, unknown> | undefined
): LeisureReadModuleSettings {
  return {
    jokeLang: raw?.jokeLang === 'en' ? 'en' : 'zh',
    articleMode: raw?.articleMode === 'today' ? 'today' : 'random'
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

export const LEISURE_READ_JOKE_LANG_OPTIONS: Array<{ label: string; value: LeisureReadJokeLang }> = [
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

export const LEISURE_READ_TAB_LABELS: Record<
  import('./types').LeisureReadTabId,
  string
> = {
  quote: '每日一言',
  joke: '冷笑话',
  riddle: '脑筋急转弯',
  article: '每日一文'
}
