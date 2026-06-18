export const DEFAULT_VEROME_BASE_URL = 'https://verome-api.deno.dev'

export class VeromeClient {
  constructor(private baseUrl: string = DEFAULT_VEROME_BASE_URL) {}

  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, '')
  }

  getBaseUrl(): string {
    return this.baseUrl
  }

  async getJson<T = unknown>(
    path: string,
    query?: Record<string, string>,
    timeoutMs = 20_000
  ): Promise<T> {
    const url = new URL(path.startsWith('http') ? path : `${this.baseUrl}${path}`)
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v) url.searchParams.set(k, v)
      }
    }
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs)
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Verome ${res.status}: ${text.slice(0, 200)}`)
    }
    return (await res.json()) as T
  }

  search(q: string, filter = 'songs') {
    return this.getJson('/api/search', { q, filter })
  }

  getSong(videoId: string) {
    return this.getJson(`/api/songs/${encodeURIComponent(videoId)}`)
  }

  getAlbum(browseId: string) {
    return this.getJson(`/api/albums/${encodeURIComponent(browseId)}`)
  }

  getArtist(browseId: string) {
    return this.getJson(`/api/artists/${encodeURIComponent(browseId)}`)
  }

  getPlaylist(playlistId: string) {
    return this.getJson(`/api/playlists/${encodeURIComponent(playlistId)}`)
  }

  getLyrics(title: string, artist: string) {
    return this.getJson('/api/lyrics', { title, artist })
  }

  getStream(id: string) {
    return this.getJson<{ url?: string; urls?: Array<{ url: string }> }>(
      '/api/stream',
      { id },
      6_000
    )
  }

  getTrending(country: string) {
    return this.getJson('/api/trending', { country })
  }

  getCharts(country?: string) {
    return this.getJson('/api/charts', country ? { country } : undefined)
  }

  getTopTracks(country?: string) {
    return this.getJson('/api/top/tracks', country ? { country } : undefined)
  }

  getTopArtists(country?: string) {
    return this.getJson('/api/top/artists', country ? { country } : undefined)
  }

  getMoods() {
    return this.getJson('/api/moods')
  }

  getMoodPlaylists(categoryId: string) {
    return this.getJson(`/api/moods/${encodeURIComponent(categoryId)}`)
  }

  getRadio(videoId: string) {
    return this.getJson('/api/radio', { videoId })
  }

  getSimilar(title: string, artist: string, limit = '10') {
    return this.getJson('/api/similar', { title, artist, limit })
  }

  getRelated(videoId: string) {
    return this.getJson(`/api/related/${encodeURIComponent(videoId)}`)
  }

  proxyUrl(targetUrl: string): string {
    return `${this.baseUrl}/api/proxy?url=${encodeURIComponent(targetUrl)}`
  }
}
