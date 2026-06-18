<script setup lang="ts">
import type { NormalizedTrack } from '@modules/music/domain/types'

const labels: Record<NormalizedTrack['provider'], string> = {
  netease: '网易云',
  kugou: '酷狗',
  verome: 'Verome',
  kuwo: '酷我',
  jamendo: 'Jamendo',
  audius: 'Audius',
  itunes: 'iTunes',
  musicbrainz: 'MB'
}

defineProps<{ provider: NormalizedTrack['provider'] }>()
</script>

<template>
  <span class="ww-music-provider-badge">{{ labels[provider] ?? provider }}</span>
</template>
