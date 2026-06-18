import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@shared/stores/settings'
import type { MusicPlatformId } from '@modules/music/domain/types'

export function parseBrowseId(
  browseId: string
): { platform: MusicPlatformId; kind: string; id: string } | null {
  const m = browseId.match(/^(netease|kugou):([^:]+):(.+)$/)
  if (!m) return null
  return { platform: m[1] as MusicPlatformId, kind: m[2]!, id: m[3]! }
}

export function useMusicPlatform() {
  const { settings } = storeToRefs(useSettingsStore())

  const platformId = computed<'netease' | 'kugou' | null>(() => {
    const s = settings.value.musicPrimarySource
    return s === 'kugou' || s === 'netease' ? s : null
  })

  const platformLabel = computed(() => {
    if (platformId.value === 'kugou') return '酷狗'
    if (platformId.value === 'netease') return '网易云'
    return ''
  })

  const isPlatformPrimary = computed(() => platformId.value != null)

  function buildBrowseId(kind: string, id: string): string {
    const normalized = id.trim()
    if (/^(netease|kugou):/.test(normalized)) return normalized
    const platform = platformId.value
    if (!platform) return normalized
    return `${platform}:${kind}:${normalized}`
  }

  function resolvePlaylistBrowseId(id: string): string | null {
    const normalized = id.trim()
    if (!normalized) return null
    if (/^(netease|kugou):/.test(normalized)) return normalized
    if (!platformId.value) return null
    return buildBrowseId('playlist', normalized)
  }

  return {
    platformId,
    platformLabel,
    isPlatformPrimary,
    buildBrowseId,
    resolvePlaylistBrowseId,
    parseBrowseId
  }
}
