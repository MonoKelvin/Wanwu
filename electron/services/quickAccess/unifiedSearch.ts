import { ensureRssSchema } from '../rss/schema'
import type { AppServices } from '../../ipc/types'
import type { QuickAccessHit, QuickAccessHitKind } from '../../../src/shared/types/quickAccess'
import { waitForLibraryBootstrap } from '../library/pack'

const KIND_LIMIT: Record<QuickAccessHitKind, number> = {
  library: 8,
  note: 4,
  link: 4,
  rss: 4,
  music: 6,
  favorite: 4,
  diagram: 6
}

const PALETTE_KIND_ORDER: QuickAccessHitKind[] = [
  'library',
  'note',
  'diagram',
  'link',
  'rss',
  'music',
  'favorite'
]

const PROVIDER_LABEL: Record<string, string> = {
  netease: '网易云',
  kugou: '酷狗',
  verome: 'Verome',
  jamendo: 'Jamendo',
  audius: 'Audius',
  itunes: 'iTunes',
  musicbrainz: 'MusicBrainz',
  kuwo: '酷我',
  local: '本地'
}

function likeTerm(query: string): string {
  return `%${query.trim()}%`
}

function pushHit(
  hits: QuickAccessHit[],
  hit: QuickAccessHit,
  kind: QuickAccessHitKind,
  perKind: Map<QuickAccessHitKind, number>
): void {
  const n = perKind.get(kind) ?? 0
  if (n >= KIND_LIMIT[kind]) return
  perKind.set(kind, n + 1)
  hits.push(hit)
}

export function searchLibraryHits(services: AppServices, term: string): QuickAccessHit[] {
  const hits: QuickAccessHit[] = []
  const perKind = new Map<QuickAccessHitKind, number>()
  const libraryHits = services.library?.searchItems(term, KIND_LIMIT.library) ?? []
  for (const row of libraryHits) {
    pushHit(
      hits,
      {
        kind: 'library',
        id: row.id,
        title: row.name,
        subtitle: [row.categoryName, row.subCategoryName].filter(Boolean).join(' · ') || null,
        itemSource: 'library',
        itemId: row.id
      },
      'library',
      perKind
    )
  }
  return hits
}

export function searchNoteHits(services: AppServices, term: string): QuickAccessHit[] {
  const hits: QuickAccessHit[] = []
  const perKind = new Map<QuickAccessHitKind, number>()
  const lower = term.toLowerCase()
  for (const note of services.notes?.listNotes() ?? []) {
    if (
      !note.title.toLowerCase().includes(lower) &&
      !note.content.toLowerCase().includes(lower)
    ) {
      continue
    }
    pushHit(
      hits,
      {
        kind: 'note',
        id: note.id,
        title: note.title.trim() || '无标题便笺',
        subtitle: '便笺',
        noteId: note.id
      },
      'note',
      perKind
    )
  }
  return hits
}

export function searchLinkHits(services: AppServices, term: string): QuickAccessHit[] {
  const hits: QuickAccessHit[] = []
  const perKind = new Map<QuickAccessHitKind, number>()
  const lower = term.toLowerCase()
  for (const bookmark of services.links?.listAllBookmarks() ?? []) {
    if (bookmark.deleted) continue
    const hay = `${bookmark.title} ${bookmark.url}`.toLowerCase()
    if (!hay.includes(lower)) continue
    pushHit(
      hits,
      {
        kind: 'link',
        id: bookmark.id,
        title: bookmark.title.trim() || bookmark.url,
        subtitle: bookmark.url,
        linkUrl: bookmark.url
      },
      'link',
      perKind
    )
  }
  return hits
}

export function searchRssHits(services: AppServices, term: string): QuickAccessHit[] {
  const hits: QuickAccessHit[] = []
  const perKind = new Map<QuickAccessHitKind, number>()
  if (!services.db) return hits

  ensureRssSchema(services.db.getRssDb())
  const rssDb = services.db.getRssDb()
  const like = likeTerm(term)
  const rssRows = rssDb
    .prepare(
      `SELECT e.id, e.title, e.feed_id as feedId, f.title as feedTitle
       FROM rss_entries e
       INNER JOIN rss_feeds f ON f.id = e.feed_id
       WHERE e.title LIKE ? COLLATE NOCASE
       ORDER BY e.published_at DESC
       LIMIT ?`
    )
    .all(like, KIND_LIMIT.rss) as Array<{
    id: string
    title: string
    feedId: string
    feedTitle: string
  }>

  for (const row of rssRows) {
    pushHit(
      hits,
      {
        kind: 'rss',
        id: row.id,
        title: row.title?.trim() || '无标题文章',
        subtitle: row.feedTitle,
        feedId: row.feedId
      },
      'rss',
      perKind
    )
  }
  return hits
}

export async function searchDiagramHits(services: AppServices, term: string): Promise<QuickAccessHit[]> {
  const hits: QuickAccessHit[] = []
  const perKind = new Map<QuickAccessHitKind, number>()
  const rows = (await services.diagrams?.searchFiles(term, KIND_LIMIT.diagram)) ?? []
  for (const row of rows) {
    pushHit(
      hits,
      {
        kind: 'diagram',
        id: row.meta.id,
        title: row.meta.title.trim() || '未命名流程图',
        subtitle: row.matchedInContent ? '流程图 · 内容匹配' : '流程图',
        diagramFileId: row.meta.id
      },
      'diagram',
      perKind
    )
  }
  return hits
}

export function searchFavoriteHits(services: AppServices, term: string): QuickAccessHit[] {
  const hits: QuickAccessHit[] = []
  const perKind = new Map<QuickAccessHitKind, number>()
  const lower = term.toLowerCase()
  for (const entry of services.personal?.listFavoriteEntries() ?? []) {
    const name = entry.item?.name ?? ''
    if (!name.toLowerCase().includes(lower)) continue
    pushHit(
      hits,
      {
        kind: 'favorite',
        id: entry.id,
        title: name,
        subtitle: '收藏',
        itemSource: entry.source,
        itemId: entry.itemId
      },
      'favorite',
      perKind
    )
  }
  return hits
}

export async function searchMusicHits(services: AppServices, term: string): Promise<QuickAccessHit[]> {
  const hits: QuickAccessHit[] = []
  const perKind = new Map<QuickAccessHitKind, number>()
  if (!services.music) return hits

  const tracks = await services.music.searchForQuickAccess(term, KIND_LIMIT.music)
  for (const track of tracks) {
    const sourceLabel = PROVIDER_LABEL[track.provider] ?? track.provider
    pushHit(
      hits,
      {
        kind: 'music',
        id: track.trackKey,
        title: track.title,
        subtitle: `${track.artist} · ${sourceLabel}`,
        musicVideoId: track.videoId,
        musicArtist: track.artist,
        musicCoverUrl: track.coverUrl,
        musicProvider: track.provider,
        musicTrackKey: track.trackKey,
        musicPayloadJson: JSON.stringify(track)
      },
      'music',
      perKind
    )
  }
  return hits
}

const SEARCH_BY_KIND: Record<
  Exclude<QuickAccessHitKind, 'music'>,
  (services: AppServices, term: string) => QuickAccessHit[] | Promise<QuickAccessHit[]>
> = {
  library: searchLibraryHits,
  note: searchNoteHits,
  diagram: searchDiagramHits,
  link: searchLinkHits,
  rss: searchRssHits,
  favorite: searchFavoriteHits
}

export async function searchHitsByKind(
  services: AppServices,
  kind: QuickAccessHitKind,
  query: string
): Promise<QuickAccessHit[]> {
  const term = query.trim()
  if (!term) return []
  if (kind === 'music') return searchMusicHits(services, term)
  return await SEARCH_BY_KIND[kind](services, term)
}

/** 各数据源并行搜索后合并（单次 IPC 仍可用） */
export async function unifiedSearch(
  services: AppServices,
  query: string,
  limit = 24
): Promise<QuickAccessHit[]> {
  const term = query.trim()
  if (!term) return []

  await waitForLibraryBootstrap()

  const chunks = await Promise.all(
    PALETTE_KIND_ORDER.map((kind) => searchHitsByKind(services, kind, term))
  )

  const merged: QuickAccessHit[] = []
  for (const chunk of chunks) merged.push(...chunk)
  return merged.slice(0, limit)
}

/** 剪贴板联想：仅图鉴，短文本 */
export async function clipboardLibraryHints(
  services: AppServices,
  text: string,
  limit = 3
): Promise<QuickAccessHit[]> {
  const term = text.trim()
  if (term.length < 2 || term.length > 120) return []
  await waitForLibraryBootstrap()
  const rows = services.library?.searchItems(term, limit) ?? []
  return rows.map((row) => ({
    kind: 'library' as const,
    id: row.id,
    title: row.name,
    subtitle: row.categoryName,
    itemSource: 'library' as const,
    itemId: row.id
  }))
}
