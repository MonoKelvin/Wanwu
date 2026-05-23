import type { MediaAttribution, MediaAttributionSource } from '@shared/types/unsplash'

export function mediaAttributionSource(
  value: MediaAttribution | null | undefined
): MediaAttributionSource {
  if (value?.source === 'pixabay' || value?.source === 'unsplash') return value.source
  if (value?.photoPageUrl?.includes('pixabay.com')) return 'pixabay'
  return 'unsplash'
}

export function isMediaAttribution(
  value: MediaAttribution | null | undefined
): value is MediaAttribution {
  return Boolean(value?.photographerName && value?.photoPageUrl)
}
