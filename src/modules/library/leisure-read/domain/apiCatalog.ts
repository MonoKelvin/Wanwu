import type { LeisureReadTabId } from '@modules/library/leisure-read/domain/types'
import { LEISURE_READ_TAB_LABELS } from '@modules/library/leisure-read/domain/settings'
import type { LeisureReadArticleMode, LeisureReadRiddleLang } from '@modules/library/leisure-read/domain/settings'
import {
  ARTICLE_CHAIN_RANDOM,
  ARTICLE_CHAIN_TODAY,
  JOKE_CHAIN,
  QUOTE_CHAIN,
  RIDDLE_CHAIN_EN,
  RIDDLE_CHAIN_ZH
} from '@modules/library/leisure-read/domain/providerChains'

export interface LeisureReadApiSourceInfo {
  id: string
  name: string
  host: string
  description: string
}

export interface LeisureReadApiGroup {
  tab: LeisureReadTabId
  label: string
  sources: LeisureReadApiSourceInfo[]
}

const API_META: Record<string, Omit<LeisureReadApiSourceInfo, 'id'>> = {
  'jinrishici-v2': {
    name: '今日诗词 v2',
    host: 'v2.jinrishici.com',
    description: '古诗词句子，需先获取 Token'
  },
  hitokoto: {
    name: 'Hitokoto',
    host: 'v1.hitokoto.cn',
    description: '开源随机一言'
  },
  jinrishici: {
    name: '今日诗词 v1',
    host: 'v1.jinrishici.com',
    description: '古诗词句子备用接口'
  },
  'xxapi-yiyan': {
    name: 'XXAPI 一言',
    host: 'v2.xxapi.cn',
    description: '聚合一言接口'
  },
  'saintic-sentence': {
    name: 'Sainic 句子',
    host: 'hub.saintic.com',
    description: '句子服务备用源'
  },
  'timelessq-joke': {
    name: 'TimelessQ',
    host: 'api.timelessq.com',
    description: '中文冷笑话'
  },
  'tmini-joke': {
    name: 'Tmini 笑话',
    host: 'www.tmini.net',
    description: '中文笑话备用源'
  },
  'jokeapi-riddle': {
    name: 'JokeAPI',
    host: 'v2.jokeapi.dev',
    description: '英文问答（setup 为题目，delivery 为谜底）'
  },
  'tangdouz-brain': {
    name: '糖豆网 · 脑筋急转弯',
    host: 'api.tangdouz.com',
    description: 'JSON 格式问答'
  },
  'tangdouz-brain-text': {
    name: '糖豆网 · 文本版',
    host: 'api.tangdouz.com',
    description: '纯文本格式备用'
  },
  'qqsuu-naowan': {
    name: 'QQ速查 · 脑玩',
    host: 'api.qqsuu.cn',
    description: '脑筋急转弯列表随机抽取'
  },
  'tangdouz-wenzhang': {
    name: '糖豆网 · 文章',
    host: 'api.tangdouz.com',
    description: '短文 JSON 接口'
  },
  'tangdouz-wenzhang-text': {
    name: '糖豆网 · 文章文本',
    host: 'api.tangdouz.com',
    description: '纯文本格式备用'
  },
  'meiriyiwen-random': {
    name: '每日一文',
    host: 'interface.meiriyiwen.com',
    description: '随机文章，含 HTML 正文'
  },
  'meiriyiwen-today': {
    name: '每日一文 · 今日',
    host: 'interface.meiriyiwen.com',
    description: '当日文章'
  }
}

function mapChain(chain: readonly string[]): LeisureReadApiSourceInfo[] {
  return chain.map((id) => {
    const meta = API_META[id]
    if (!meta) return { id, name: id, host: '—', description: '第三方接口' }
    return { id, ...meta }
  })
}

export function resolveLeisureReadApiGroups(settings: {
  riddleLang: LeisureReadRiddleLang
  articleMode: LeisureReadArticleMode
}): LeisureReadApiGroup[] {
  const riddleChain = settings.riddleLang === 'en' ? RIDDLE_CHAIN_EN : RIDDLE_CHAIN_ZH
  const riddleLabel =
    settings.riddleLang === 'en'
      ? `${LEISURE_READ_TAB_LABELS.riddle}（English）`
      : `${LEISURE_READ_TAB_LABELS.riddle}（中文）`

  const articleChain =
    settings.articleMode === 'today' ? ARTICLE_CHAIN_TODAY : ARTICLE_CHAIN_RANDOM
  const articleLabel =
    settings.articleMode === 'today'
      ? `${LEISURE_READ_TAB_LABELS.article}（今日）`
      : `${LEISURE_READ_TAB_LABELS.article}（随机）`

  return [
    { tab: 'quote', label: LEISURE_READ_TAB_LABELS.quote, sources: mapChain(QUOTE_CHAIN) },
    { tab: 'joke', label: LEISURE_READ_TAB_LABELS.joke, sources: mapChain(JOKE_CHAIN) },
    { tab: 'riddle', label: riddleLabel, sources: mapChain(riddleChain) },
    { tab: 'article', label: articleLabel, sources: mapChain(articleChain) }
  ]
}
