import { hashContentId } from '@modules/library/leisure-read/domain/types'
import { SNIPPET_GROUP_PREFIX } from '@modules/library/leisure-read/domain/favoriteMeta'

export function hashArticleId(title: string | undefined, body: string): string {
  const payload = `${title ?? ''}|${body}`.trim()
  if (!payload) return hashContentId('empty-article')
  return hashContentId(payload)
}

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
  return hashArticleId(input.title, input.body)
}

export function snippetGroupContentId(articleId: string): string {
  return `${SNIPPET_GROUP_PREFIX}${articleId}`
}
