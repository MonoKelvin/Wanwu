export type NavAlign = 'center' | 'start'
export type NavDisplay = 'icon' | 'both'
export type RssFetchLimit = 20 | 30 | 50

export interface AppSettings {
  navAlign: NavAlign
  navDisplay: NavDisplay
  rssFetchLimit: RssFetchLimit
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  navAlign: 'start',
  navDisplay: 'icon',
  rssFetchLimit: 20
}

export const RSS_FETCH_LIMIT_OPTIONS: RssFetchLimit[] = [20, 30, 50]
