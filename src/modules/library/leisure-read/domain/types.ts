export type LeisureReadTabId = 'quote' | 'joke' | 'riddle' | 'article'

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
}

export interface LeisureReadFavoriteInput {
  tab: LeisureReadTabId
  contentId: string
  title?: string
  body: string
  subtitle?: string
  footer?: string
  providerId?: string
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
