export type LeisureReadTabId = 'quote' | 'joke' | 'riddle' | 'article'

export type LeisureReadFavoriteKind = 'full' | 'snippet'

export interface LeisureReadSnippetRange {
  start: number
  end: number
  text?: string
}

export interface LeisureReadContent {
  tab: LeisureReadTabId
  contentId: string
  title?: string
  subtitle?: string
  body: string
  footer?: string
  htmlBody?: string
  answer?: string
  providerId: string
  highlightRanges?: LeisureReadSnippetRange[]
}

export interface LeisureReadFavorite {
  id: string
  tab: LeisureReadTabId
  contentId: string
  title: string | null
  body: string
  subtitle: string | null
  footer: string | null
  providerId: string | null
  createdAt: number
  articleId?: string | null
  kind?: LeisureReadFavoriteKind
  snippets?: string[]
  snippetRanges?: LeisureReadSnippetRange[]
}

export interface LeisureReadFavoriteInput {
  tab: LeisureReadTabId
  contentId: string
  title?: string
  body: string
  subtitle?: string
  footer?: string
  providerId?: string
  kind?: LeisureReadFavoriteKind
  articleId?: string
  snippet?: string
  snippetRange?: LeisureReadSnippetRange
}

export interface LeisureReadUpdateArticleSnippetsInput {
  articleId: string
  body: string
  title?: string | null
  subtitle?: string | null
  footer?: string | null
  providerId?: string | null
  ranges: LeisureReadSnippetRange[]
}

export class LeisureReadFetchError extends Error {
  constructor(message = 'all_providers_failed') {
    super(message)
    this.name = 'LeisureReadFetchError'
  }
}

export function hashContentId(input: string): string {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i)
  }
  return (hash >>> 0).toString(36)
}

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function joinFooter(parts: Array<string | undefined | null>): string | undefined {
  const text = parts.filter(Boolean).join(' · ')
  return text || undefined
}
