import type {
  LeisureReadContent,
  LeisureReadFavorite,
  LeisureReadFavoriteInput,
  LeisureReadSnippetRange,
  LeisureReadTabId
} from '@modules/library/leisure-read/domain/types'
import { hashContentId } from '@modules/library/leisure-read/domain/types'
import type { LeisureReadFavoriteKind } from '@modules/library/leisure-read/domain/favoriteMeta'
import { SNIPPET_GROUP_PREFIX } from '@modules/library/leisure-read/domain/favoriteMeta'
import { resolveSnippetRanges } from '@modules/library/leisure-read/domain/snippetRanges'

export function deriveArticleId(input: {
  contentId?: string
  title?: string
  body: string
}): string {
  const raw = input.contentId?.trim()
  if (raw) {
    if (raw.startsWith(SNIPPET_GROUP_PREFIX)) {
      return raw.slice(SNIPPET_GROUP_PREFIX.length)
    }
    const base = raw.split(':')[0]
    if (base) return base
  }
  return hashContentId(`${input.title ?? ''}|${input.body}`)
}

export function snippetGroupContentId(articleId: string): string {
  return `${SNIPPET_GROUP_PREFIX}${articleId}`
}

export function parseSnippetsJson(raw: string | null | undefined, articleText = ''): string[] {
  return resolveSnippetRanges(articleText, raw)
    .map((range) => range.text ?? '')
    .filter(Boolean)
}

export function favoriteToContent(favorite: LeisureReadFavorite): LeisureReadContent {
  const articleId =
    favorite.articleId ??
    deriveArticleId({
      contentId: favorite.contentId,
      title: favorite.title ?? undefined,
      body: favorite.body
    })

  if (favorite.tab === 'riddle') {
    return {
      tab: 'riddle',
      contentId: favorite.contentId,
      body: favorite.body,
      answer: favorite.footer ?? '',
      providerId: favorite.providerId ?? 'favorite'
    }
  }

  if (favorite.tab === 'article') {
    return {
      tab: 'article',
      contentId: articleId,
      title: favorite.title ?? undefined,
      subtitle: favorite.subtitle ?? undefined,
      body: favorite.body,
      footer: favorite.kind === 'full' ? favorite.footer ?? undefined : undefined,
      providerId: favorite.providerId ?? 'favorite',
      highlightRanges: favorite.kind === 'snippet' ? favorite.snippetRanges : undefined
    }
  }

  return {
    tab: favorite.tab,
    contentId: favorite.contentId,
    title: favorite.title ?? undefined,
    subtitle: favorite.subtitle ?? undefined,
    body: favorite.body,
    footer: favorite.footer ?? undefined,
    providerId: favorite.providerId ?? 'favorite'
  }
}

export function buildFullFavoriteInput(content: LeisureReadContent): LeisureReadFavoriteInput {
  const articleId = deriveArticleId({
    contentId: content.contentId,
    title: content.title,
    body: content.body
  })
  return {
    tab: 'article',
    kind: 'full',
    articleId,
    contentId: articleId,
    title: content.title,
    body: content.body,
    subtitle: content.subtitle,
    footer: content.footer,
    providerId: content.providerId
  }
}

export function buildSnippetFavoriteInput(
  content: LeisureReadContent,
  snippet: string,
  snippetRange?: LeisureReadSnippetRange
): LeisureReadFavoriteInput {
  const articleId = deriveArticleId({
    contentId: content.contentId,
    title: content.title,
    body: content.body
  })
  return {
    tab: 'article',
    kind: 'snippet',
    articleId,
    contentId: snippetGroupContentId(articleId),
    snippet: snippet.trim(),
    snippetRange,
    title: content.title,
    body: content.body,
    subtitle: content.subtitle,
    footer: content.footer,
    providerId: content.providerId
  }
}

export function buildGenericFavoriteInput(content: LeisureReadContent): LeisureReadFavoriteInput {
  if (content.tab === 'article') return buildFullFavoriteInput(content)
  return {
    tab: content.tab,
    kind: 'full',
    contentId: content.contentId,
    title: content.title,
    body: content.body,
    subtitle: content.subtitle,
    footer: content.tab === 'riddle' ? content.answer : content.footer,
    providerId: content.providerId
  }
}

export interface FavoriteCardView {
  id: string
  tab: LeisureReadTabId
  kind: LeisureReadFavoriteKind | 'item'
  title: string
  preview: string
  meta?: string
  createdAt: number
  favorite: LeisureReadFavorite
}

export function toFavoriteCardView(favorite: LeisureReadFavorite): FavoriteCardView {
  const tab = favorite.tab

  if (tab === 'article' && favorite.kind === 'snippet') {
    const ranges = favorite.snippetRanges ?? []
    const firstSnippet =
      ranges[0]?.text ?? favorite.snippets?.[0] ?? favorite.body.slice(ranges[0]?.start ?? 0, ranges[0]?.end)
    return {
      id: favorite.id,
      tab,
      kind: 'snippet',
      title: favorite.title?.replace(/ · 片段$/, '') || '文章片段收藏',
      preview: firstSnippet || favorite.body.slice(0, 120),
      meta: favorite.subtitle ?? undefined,
      createdAt: favorite.createdAt,
      favorite
    }
  }

  if (tab === 'article' && favorite.kind === 'full') {
    return {
      id: favorite.id,
      tab,
      kind: 'full',
      title: favorite.title || favorite.body.slice(0, 48),
      preview: favorite.body.slice(0, 160),
      meta: favorite.subtitle ?? undefined,
      createdAt: favorite.createdAt,
      favorite
    }
  }

  if (tab === 'riddle') {
    return {
      id: favorite.id,
      tab,
      kind: 'item',
      title: favorite.body.slice(0, 48),
      preview: favorite.footer ? `谜底：${favorite.footer}` : '点击查看谜底',
      createdAt: favorite.createdAt,
      favorite
    }
  }

  return {
    id: favorite.id,
    tab,
    kind: 'item',
    title: favorite.title || favorite.body.slice(0, 48),
    preview:
      tab === 'quote'
        ? favorite.body.slice(0, 120)
        : favorite.subtitle || favorite.body.slice(0, 120),
    meta: tab === 'quote' ? favorite.footer ?? undefined : favorite.subtitle ?? undefined,
    createdAt: favorite.createdAt,
    favorite
  }
}
