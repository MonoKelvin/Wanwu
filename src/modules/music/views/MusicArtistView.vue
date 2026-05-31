<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MusicAlbumHero from '@modules/music/components/MusicAlbumHero.vue'
import MusicChartList from '@modules/music/components/MusicChartList.vue'
import MusicCoverRow from '@modules/music/components/MusicCoverRow.vue'
import MusicDiscoverSection from '@modules/music/components/MusicDiscoverSection.vue'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'
import type { MusicArtistPayload, NormalizedTrack } from '@shared/types/music'
import '@modules/music/styles/music-shared.css'

const route = useRoute()
const router = useRouter()
const player = useMusicPlayerStore()
const artist = ref<MusicArtistPayload>({ name: '歌手', tracks: [], albums: [] })
const loading = ref(true)
const browseId = computed(() => String(route.params.browseId ?? ''))

onMounted(async () => {
  loading.value = true
  try {
    artist.value = await window.wanwu.music.getArtist(browseId.value)
  } finally {
    loading.value = false
  }
})

function play(track: NormalizedTrack) {
  void player.playTrack(track, artist.value.tracks)
}

function openAlbum(id: string) {
  void router.push({ name: 'music-album', params: { browseId: id } })
}

const albumItems = computed(() =>
  artist.value.albums.map((a) => ({
    id: a.browseId,
    title: a.title,
    coverUrl: a.coverUrl
  }))
)
</script>

<template>
  <div class="ww-music-tab-body ww-scroll-main">
    <div class="ww-music-content-shell">
      <p v-if="loading" class="ww-music-state-hint">加载中…</p>
      <template v-else>
        <MusicAlbumHero
          :title="artist.name"
          subtitle="歌手"
          :cover-url="artist.coverUrl"
          :meta="artist.description"
        />

        <MusicDiscoverSection v-if="artist.tracks.length" title="热门曲目">
          <MusicChartList :tracks="artist.tracks" panel @play="play" />
        </MusicDiscoverSection>

        <MusicDiscoverSection v-if="albumItems.length" title="专辑">
          <MusicCoverRow :items="albumItems" @select="(item) => openAlbum(item.id)" />
        </MusicDiscoverSection>

        <p v-if="!artist.tracks.length && !albumItems.length" class="ww-music-state-hint">
          暂无曲目数据，请从搜索进入专辑或单曲。
        </p>
      </template>
    </div>
  </div>
</template>
