import type { LeisureReadRiddleLang, LeisureReadArticleMode } from '@modules/library/leisure-read/domain/settings'
import type { LeisureReadTabId } from '@modules/library/leisure-read/domain/types'

export const QUOTE_CHAIN = [
  'jinrishici-v2',
  'hitokoto',
  'jinrishici',
  'xxapi-yiyan',
  'saintic-sentence'
] as const

export const JOKE_CHAIN = ['timelessq-joke', 'tmini-joke'] as const

export const RIDDLE_CHAIN_ZH = ['tangdouz-brain', 'tangdouz-brain-text', 'qqsuu-naowan'] as const
export const RIDDLE_CHAIN_EN = ['jokeapi-riddle'] as const

export const ARTICLE_CHAIN_RANDOM = [
  'tangdouz-wenzhang',
  'tangdouz-wenzhang-text',
  'meiriyiwen-random'
] as const
export const ARTICLE_CHAIN_TODAY = [
  'tangdouz-wenzhang',
  'tangdouz-wenzhang-text',
  'meiriyiwen-today'
] as const

export type ProviderChainId =
  | (typeof QUOTE_CHAIN)[number]
  | (typeof JOKE_CHAIN)[number]
  | (typeof RIDDLE_CHAIN_ZH)[number]
  | (typeof RIDDLE_CHAIN_EN)[number]
  | (typeof ARTICLE_CHAIN_RANDOM)[number]
  | (typeof ARTICLE_CHAIN_TODAY)[number]

export function resolveRiddleChain(lang: LeisureReadRiddleLang): readonly string[] {
  return lang === 'en' ? RIDDLE_CHAIN_EN : RIDDLE_CHAIN_ZH
}

export function resolveArticleChain(mode: LeisureReadArticleMode): readonly string[] {
  return mode === 'today' ? ARTICLE_CHAIN_TODAY : ARTICLE_CHAIN_RANDOM
}

export function resolveProviderList(
  tab: LeisureReadTabId,
  settings: { riddleLang: LeisureReadRiddleLang; articleMode: LeisureReadArticleMode }
): readonly string[] {
  if (tab === 'quote') return QUOTE_CHAIN
  if (tab === 'joke') return JOKE_CHAIN
  if (tab === 'riddle') return resolveRiddleChain(settings.riddleLang)
  return resolveArticleChain(settings.articleMode)
}
