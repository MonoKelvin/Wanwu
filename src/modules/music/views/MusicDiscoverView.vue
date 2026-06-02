<script setup lang="ts">
import { computed, onActivated, onDeactivated, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import MusicPageHeading from '@modules/music/components/MusicPageHeading.vue'
import MusicDiscoverSection from '@modules/music/components/MusicDiscoverSection.vue'
import MusicLoginBanner from '@modules/music/components/MusicLoginBanner.vue'
import MusicPlatformLoginDialog from '@modules/music/components/MusicPlatformLoginDialog.vue'
import MusicTrackCarousel from '@modules/music/components/MusicTrackCarousel.vue'
import MusicChartList from '@modules/music/components/MusicChartList.vue'
import MusicChartCarousel from '@modules/music/components/MusicChartCarousel.vue'
import MusicCoverRow from '@modules/music/components/MusicCoverRow.vue'
import { useMusicAccount } from '@modules/music/composables/useMusicAccount'
import { useMusicPlatform } from '@modules/music/composables/useMusicPlatform'
import { useMusicDiscoverStore } from '@modules/music/stores/musicDiscover'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'
import { useAsyncTask } from '@modules/music/composables/useAsyncTask'
import { useLoadQueue } from '@modules/music/composables/useLoadQueue'
import {
  clearMusicViewCache,
  readMusicViewCache,
  writeMusicViewCache
} from '@modules/music/lib/musicViewCache'
import type { MusicChartCard, MusicChartSection, NormalizedTrack } from '@shared/types/music'
import MusicScrollBody from '@modules/music/components/MusicScrollBody.vue'
import '@modules/music/styles/music-shared.css'

defineOptions({ name: 'MusicDiscoverView' })

const router = useRouter()
const discover = useMusicDiscoverStore()
const player = useMusicPlayerStore()
const account = useMusicAccount()
const { refresh: refreshAccount } = account
const { buildBrowseId, platformLabel, platformId, isPlatformPrimary } = useMusicPlatform()

const loginOpen = ref(false)
const albumsSeed = ref(0)
const artistsOffset = ref(0)
const forYouTracks = ref<NormalizedTrack[]>([])
const forYouLoading = ref(false)
const forYouReady = ref(false)
const dailyTracks = ref<NormalizedTrack[]>([])
const newAlbums = ref<Array<{ browseId: string; title: string; artist: string; coverUrl?: string }>>([])
const chartSections = ref<MusicChartSection[]>([])
const artistPreview = ref<Array<{ browseId: string; name: string; coverUrl?: string }>>([])

const dailyLoading = ref(false)
const dailyReady = ref(false)
const albumsLoading = ref(false)
const albumsReady = ref(false)
const artistsLoading = ref(false)
const artistsReady = ref(false)
const chartsLoading = ref(false)
const chartsReady = ref(false)

const loadTask = useAsyncTask()
const sectionQueue = useLoadQueue()

const albumCoverItems = computed(() =>
  newAlbums.value.map((a) => ({
    id: a.browseId,
    title: a.title,
    subtitle: a.artist,
    coverUrl: a.coverUrl
  }))
)

const artistCoverItems = computed(() =>
  artistPreview.value.map((a) => ({
    id: a.browseId,
    title: a.name,
    coverUrl: a.coverUrl,
    shape: 'circle' as const
  }))
)

function cacheKey(suffix: string) {
  return `discover:${suffix}:${platformId.value}`
}

onActivated(() => {
  discover.startAutoRefresh()
  if (!forYouReady.value) void loadForYou()
  requestAnimationFrame(() => {
    void player.refreshFavorites()
  })
})

function ensureDaily() {
  if (dailyReady.value || dailyLoading.value) return
  sectionQueue.enqueue(() => loadDaily())
}

function ensureAlbums() {
  if (albumsReady.value || albumsLoading.value) return
  sectionQueue.enqueue(() => loadAlbums())
}

function ensureArtists() {
  if (artistsReady.value || artistsLoading.value) return
  sectionQueue.enqueue(() => loadArtists())
}

function ensureCharts() {
  if (chartsReady.value || chartsLoading.value) return
  sectionQueue.enqueue(() => loadCharts())
}

onDeactivated(() => {
  discover.stopAutoRefresh()
})

watch(platformId, () => {
  loadTask.cancel()
  clearMusicViewCache('discover:')
  forYouReady.value = false
  dailyReady.value = false
  albumsReady.value = false
  artistsReady.value = false
  chartsReady.value = false
  void loadForYou(true)
})

watch(
  () => account.profile.value.loggedIn,
  () => {
    void loadForYou()
    void loadDaily()
  }
)

watch(
  () => discover.forYou.data,
  (tracks) => {
    if (forYouLoading.value || !forYouReady.value) return
    if (tracks.length) forYouTracks.value = tracks.slice(0, 32)
  }
)

function shuffleTracks<T>(list: T[]): T[] {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]!
    arr[i] = arr[j]!
    arr[j] = tmp
  }
  return arr
}

function sectionCards(section: MusicChartSection & { cards?: MusicChartCard[] }): MusicChartCard[] {
  if (section.cards?.length) return section.cards
  if (!Array.isArray(section.items)) return []
  return section.items.filter((item): item is MusicChartCard => 'browseId' in (item as object))
}

const chartCarouselCards = computed(() =>
  chartSections.value.flatMap((section) => sectionCards(section))
)

async function loadForYou(force = false) {
  if (!isPlatformPrimary.value) {
    forYouTracks.value = []
    forYouReady.value = true
    return
  }
  if (forYouLoading.value && !force) return

  const token = loadTask.next()
  forYouLoading.value = true
  if (!force) forYouReady.value = false
  try {
    if (force) await discover.refreshSection('forYou')
    else await discover.loadSection('forYou')
    if (!loadTask.isCurrent(token)) return

    let tracks = [...discover.forYou.data]

    if (!tracks.length) {
      const songs = await window.wanwu.music.getNewSongs(24).catch(() => [] as NormalizedTrack[])
      if (!loadTask.isCurrent(token)) return
      if (songs.length) tracks = songs
    }

    if (!tracks.length && account.profile.value.loggedIn) {
      const daily = await window.wanwu.music.getDailyRecommend().catch(() => [] as NormalizedTrack[])
      if (!loadTask.isCurrent(token)) return
      if (daily.length) tracks = daily
    }

    if (!tracks.length && account.profile.value.loggedIn) {
      const fm = await window.wanwu.music.getPersonalFm().catch(() => [] as NormalizedTrack[])
      if (!loadTask.isCurrent(token)) return
      if (fm.length) tracks = fm
    }

    if (force && tracks.length > 1) tracks = shuffleTracks(tracks)
    forYouTracks.value = tracks.slice(0, 32)
  } finally {
    if (loadTask.isCurrent(token)) {
      forYouLoading.value = false
      forYouReady.value = true
    }
  }
}

async function loadDaily(force = false) {
  if (!isPlatformPrimary.value || !account.profile.value.loggedIn) {
    dailyTracks.value = []
    dailyReady.value = true
    return
  }
  if (dailyLoading.value && !force) return

  if (!force) {
    const cached = readMusicViewCache<NormalizedTrack[]>(cacheKey('daily'))
    if (cached?.length) {
      dailyTracks.value = cached
      dailyReady.value = true
      return
    }
  }

  dailyLoading.value = true
  if (!force) dailyReady.value = false
  try {
    let tracks = await window.wanwu.music.getDailyRecommend().catch(() => [])
    if (force && tracks.length > 1) tracks = shuffleTracks(tracks)
    dailyTracks.value = tracks
    if (tracks.length) writeMusicViewCache(cacheKey('daily'), tracks)
  } finally {
    dailyLoading.value = false
    dailyReady.value = true
  }
}

async function loadAlbums(force = false) {
  if (!isPlatformPrimary.value) {
    newAlbums.value = []
    albumsReady.value = true
    return
  }
  if (albumsLoading.value && !force) return

  if (!force) {
    const cached = readMusicViewCache<typeof newAlbums.value>(cacheKey(`albums:${albumsSeed.value}`))
    if (cached?.length) {
      newAlbums.value = cached
      albumsReady.value = true
      return
    }
  }

  albumsLoading.value = true
  if (!force) albumsReady.value = false
  try {
    if (force) albumsSeed.value += 1
    const albums = await window.wanwu.music.getNewAlbums(16, albumsSeed.value).catch(() => [])
    newAlbums.value = albums
    if (albums.length) writeMusicViewCache(cacheKey(`albums:${albumsSeed.value}`), albums)
  } finally {
    albumsLoading.value = false
    albumsReady.value = true
  }
}

async function loadArtists(force = false) {
  if (!isPlatformPrimary.value) {
    artistPreview.value = []
    artistsReady.value = true
    return
  }
  if (artistsLoading.value && !force) return

  if (!force) {
    const cached = readMusicViewCache<typeof artistPreview.value>(cacheKey(`artists:${artistsOffset.value}`))
    if (cached?.length) {
      artistPreview.value = cached
      artistsReady.value = true
      return
    }
  }

  artistsLoading.value = true
  if (!force) artistsReady.value = false
  try {
    if (force) artistsOffset.value += 12
    const artists = await window.wanwu.music
      .getNeteaseArtistList(12, artistsOffset.value)
      .catch(() => [])
    artistPreview.value = artists
    if (artists.length) writeMusicViewCache(cacheKey(`artists:${artistsOffset.value}`), artists)
  } finally {
    artistsLoading.value = false
    artistsReady.value = true
  }
}

async function loadCharts(force = false) {
  if (!isPlatformPrimary.value) {
    chartSections.value = []
    chartsReady.value = true
    return
  }
  if (chartsLoading.value && !force) return

  if (!force) {
    const cached = readMusicViewCache<MusicChartSection[]>(cacheKey('charts'))
    if (cached?.length) {
      chartSections.value = cached
      chartsReady.value = true
      return
    }
  }

  chartsLoading.value = true
  if (!force) chartsReady.value = false
  try {
    const charts = await window.wanwu.music.getCharts().catch(() => ({ sections: [] }))
    let sections = charts.sections ?? []
    if (force && sections.length > 1) {
      const shift = Math.floor(Math.random() * sections.length)
      sections = [...sections.slice(shift), ...sections.slice(0, shift)]
    }
    chartSections.value = sections
    if (sections.length) writeMusicViewCache(cacheKey('charts'), sections)
  } finally {
    chartsLoading.value = false
    chartsReady.value = true
  }
}

function playFrom(tracks: NormalizedTrack[], track: NormalizedTrack) {
  void player.playTrack(track, tracks.length ? tracks : [track])
}

function openToplist(card: MusicChartCard) {
  const id = card.browseId ?? buildBrowseId('toplist', card.playlistId ?? '')
  if (!id) return
  void router.push({ name: 'music-toplist', params: { browseId: encodeURIComponent(id) } })
}

function openAlbum(item: { id: string; title?: string }) {
  void router.push({
    name: 'music-album',
    params: { browseId: item.id },
    query: item.title ? { title: item.title } : undefined
  })
}

function openArtist(item: { id: string; title?: string; coverUrl?: string }) {
  void router.push({
    name: 'music-artist',
    params: { browseId: item.id },
    query: {
      ...(item.title ? { name: item.title } : {}),
      ...(item.coverUrl ? { cover: item.coverUrl } : {})
    }
  })
}

function openFm() {
  void router.push({ name: 'music-fm' })
}

function openCloud() {
  void router.push({ name: 'music-cloud' })
}

function openRadio() {
  void router.push({ name: 'music-radio' })
}

function openArtists() {
  void router.push({ name: 'music-artists' })
}

function onLoginSuccess() {
  void refreshAccount().then(() => {
    sectionQueue.enqueue(() => loadForYou())
    sectionQueue.enqueue(() => loadDaily())
  })
}

const showLoginBanner = computed(
  () => account.hasPlatformAccount.value && !account.profile.value.loggedIn
)
</script>

<template>
  <MusicScrollBody>
    <div class="ww-music-content-shell">
      <MusicPageHeading title="发现" subtitle="推荐 · 新碟 · 歌手 · FM" />

      <MusicLoginBanner
        v-if="showLoginBanner"
        :platform-label="platformLabel"
        @login="loginOpen = true"
      />

      <MusicDiscoverSection title="为你推荐" :refreshing="forYouLoading" @refresh="loadForYou(true)">
        <MusicTrackCarousel
          :tracks="forYouTracks"
          :loading="forYouLoading || !forYouReady"
          @play="(t) => playFrom(forYouTracks, t)"
        />
        <p v-if="forYouReady && !forYouLoading && !forYouTracks.length" class="ww-music-state-hint">
          暂无推荐，{{ showLoginBanner ? '登录后刷新试试' : '稍后再试' }}
        </p>
      </MusicDiscoverSection>

      <MusicDiscoverSection
        v-if="account.profile.value.loggedIn"
        lazy
        title="每日推荐"
        :refreshing="dailyLoading"
        @refresh="loadDaily(true)"
        @visible="ensureDaily"
      >
        <MusicChartList
          v-if="dailyLoading || dailyTracks.length"
          :tracks="dailyTracks.slice(0, 12)"
          :loading="dailyLoading || !dailyReady"
          panel
          show-provider
          @play="(t) => playFrom(dailyTracks, t)"
        />
        <p v-else-if="dailyReady" class="ww-music-state-hint">暂无日推内容</p>
      </MusicDiscoverSection>

      <MusicDiscoverSection
        lazy
        title="新碟"
        more-label="更多"
        :refreshing="albumsLoading"
        @refresh="loadAlbums(true)"
        @visible="ensureAlbums"
        @more="() => router.push({ name: 'music-new' })"
      >
        <MusicCoverRow
          :items="albumCoverItems"
          :loading="albumsLoading || !albumsReady"
          size="album"
          @select="openAlbum"
        />
      </MusicDiscoverSection>

      <MusicDiscoverSection
        lazy
        title="热门歌手"
        more-label="更多"
        :refreshing="artistsLoading"
        @refresh="loadArtists(true)"
        @visible="ensureArtists"
        @more="openArtists"
      >
        <MusicCoverRow
          :items="artistCoverItems"
          :loading="artistsLoading || !artistsReady"
          size="artist"
          skeleton-shape="circle"
          @select="openArtist"
        />
      </MusicDiscoverSection>

      <MusicDiscoverSection
        lazy
        title="官方榜单"
        more-label="更多"
        :refreshing="chartsLoading"
        @refresh="loadCharts(true)"
        @visible="ensureCharts"
        @more="() => router.push({ name: 'music-charts' })"
      >
        <MusicChartCarousel
          :cards="chartCarouselCards"
          :loading="chartsLoading || !chartsReady"
          @select="openToplist"
        />
      </MusicDiscoverSection>

      <section class="ww-music-discover-more-section">
        <p class="ww-music-mine-section-label">个性化</p>
        <div class="ww-music-discover-more-grid">
          <button type="button" class="ww-music-discover-more-card" @click="openFm">
            <p class="ww-music-discover-more-card__title">私人 FM</p>
            <p class="ww-music-discover-more-card__desc">
              {{ platformLabel ? `${platformLabel} 漫游` : '平台 FM' }} · 需登录
            </p>
          </button>
          <button type="button" class="ww-music-discover-more-card" @click="openCloud">
            <p class="ww-music-discover-more-card__title">音乐云盘</p>
            <p class="ww-music-discover-more-card__desc">
              {{ platformLabel ? `${platformLabel} 云盘` : '平台云盘' }} · 需登录
            </p>
          </button>
        </div>
      </section>

      <section class="ww-music-discover-more-section">
        <p class="ww-music-mine-section-label">浏览</p>
        <div class="ww-music-discover-more-grid">
          <button type="button" class="ww-music-discover-more-card" @click="openRadio">
            <p class="ww-music-discover-more-card__title">场景电台</p>
            <p class="ww-music-discover-more-card__desc">按场景聆听</p>
          </button>
          <button type="button" class="ww-music-discover-more-card" @click="openArtists">
            <p class="ww-music-discover-more-card__title">歌手</p>
            <p class="ww-music-discover-more-card__desc">浏览全部歌手</p>
          </button>
        </div>
      </section>
    </div>
    <MusicPlatformLoginDialog v-model:visible="loginOpen" @success="onLoginSuccess" />
  </MusicScrollBody>
</template>
