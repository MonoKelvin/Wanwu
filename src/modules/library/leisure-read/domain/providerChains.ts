import type { LeisureReadJokeLang, LeisureReadArticleMode } from '@modules/library/leisure-read/domain/settings'
import type { LeisureReadTabId } from '@modules/library/leisure-read/domain/types'

export const QUOTE_CHAIN = [
  'hitokoto',
  'jinrishici',
  'xxapi-yiyan',
  'saintic-sentence'
] as const

export const JOKE_CHAIN_ZH = ['vvhan-joke', 'timelessq-joke', 'brisk-joke', 'tmini-joke'] as const
export const JOKE_CHAIN_EN = ['jokeapi-safe', 'official-joke-api', 'icanhazdadjoke'] as const

export const RIDDLE_CHAIN = ['vvhan-miyu', 'xxapi-miyu', 'local-riddle-seed'] as const

export const ARTICLE_CHAIN_RANDOM = ['meiriyiwen-random'] as const
export const ARTICLE_CHAIN_TODAY = ['meiriyiwen-today'] as const

export type ProviderChainId =
  | (typeof QUOTE_CHAIN)[number]
  | (typeof JOKE_CHAIN_ZH)[number]
  | (typeof JOKE_CHAIN_EN)[number]
  | (typeof RIDDLE_CHAIN)[number]
  | (typeof ARTICLE_CHAIN_RANDOM)[number]
  | (typeof ARTICLE_CHAIN_TODAY)[number]

export function resolveJokeChain(lang: LeisureReadJokeLang): readonly string[] {
  return lang === 'en' ? JOKE_CHAIN_EN : JOKE_CHAIN_ZH
}

export function resolveArticleChain(mode: LeisureReadArticleMode): readonly string[] {
  return mode === 'today' ? ARTICLE_CHAIN_TODAY : ARTICLE_CHAIN_RANDOM
}

export function resolveProviderList(
  tab: LeisureReadTabId,
  settings: { jokeLang: LeisureReadJokeLang; articleMode: LeisureReadArticleMode }
): readonly string[] {
  if (tab === 'quote') return QUOTE_CHAIN
  if (tab === 'joke') return resolveJokeChain(settings.jokeLang)
  if (tab === 'riddle') return RIDDLE_CHAIN
  return resolveArticleChain(settings.articleMode)
}
