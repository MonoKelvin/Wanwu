export interface SongMatchInfo {
  keyword: string
  songName: string
  artist: string
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[（(][^）)]*[）)]/g, '')
    .trim()
}

export function normalizeArtist(artist: string): string {
  return artist
    .toLowerCase()
    .replace(/[&/、，,;；]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isSongMatch(
  resultName: string,
  resultArtist: string | undefined,
  match: SongMatchInfo
): boolean {
  const normalizedResult = normalizeName(resultName)
  const normalizedOriginal = normalizeName(match.songName)
  if (!normalizedResult) return false
  if (normalizedOriginal) {
    if (
      !normalizedResult.includes(normalizedOriginal) &&
      !normalizedOriginal.includes(normalizedResult)
    ) {
      return false
    }
  }
  if (resultArtist && match.artist) {
    const normalizedResultArtist = normalizeArtist(resultArtist)
    const normalizedOriginalArtist = normalizeArtist(match.artist)
    if (normalizedResultArtist && normalizedOriginalArtist) {
      if (
        !normalizedResultArtist.includes(normalizedOriginalArtist) &&
        !normalizedOriginalArtist.includes(normalizedResultArtist)
      ) {
        return false
      }
    }
  }
  return true
}

export function buildSongMatch(title: string, artist: string): SongMatchInfo {
  const songName = title.trim()
  const artistName = artist.trim()
  return {
    keyword: artistName ? `${songName}-${artistName}` : songName,
    songName,
    artist: artistName
  }
}
