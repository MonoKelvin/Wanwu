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

onActivated(() => {
  void discover.ensureLoaded()
  void player.refreshFavorites()
  discover.startAutoRefresh()
  if (!forYouReady.value) void loadForYou()
})

function ensureDaily() {
  if (!dailyReady.value) void loadDaily()
}

function ensureAlbums() {
  if (!albumsReady.value) void loadAlbums()
}

function ensureArtists() {
  if (!artistsReady.value) void loadArtists()
}

function ensureCharts() {
  if (!chartsReady.value) void loadCharts()
}

onDeactivated(() => {
  discover.stopAutoRefresh()
})

watch(platformId, () => {
  void discover.reloadAll()
  void Promise.all([loadForYou(), loadDaily(), loadAlbums(), loadArtists(), loadCharts()])
})

watch(
  () => account.profile.value.loggedIn,
  () => {
    void loadForYou()
    void loadDaily()
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

  forYouLoading.value = true
  if (!force) forYouReady.value = false
  try {
    if (force) {
      await discover.refreshSection('forYou')
    } else {
      await discover.loadSection('forYou')
    }

    let tracks = [...discover.forYou.data]

    if (!tracks.length || force) {
      const [refreshed, songs] = await Promise.all([
        force ? Promise.resolve() : discover.refreshSection('forYou').catch(() => {}),
        window.wanwu.music.getNewSongs(24).catch(() => [] as NormalizedTrack[])
      ])
      void refreshed
      if (discover.forYou.data.length) tracks = [...discover.forYou.data]
      else if (songs.length) tracks = songs
    }

    if ((!tracks.length || force) && account.profile.value.loggedIn) {
      const daily = await window.wanwu.music.getDailyRecommend().catch(() => [] as NormalizedTrack[])
      if (daily.length) tracks = force ? shuffleTracks(daily) : daily
    }
    if (!tracks.length && account.profile.value.loggedIn) {
      const fm = await window.wanwu.music.getPersonalFm().catch(() => [] as NormalizedTrack[])
      if (fm.length) tracks = fm
    }

    if (force && tracks.length > 1) tracks = shuffleTracks(tracks)
    forYouTracks.value = tracks.slice(0, 32)
  } finally {
    forYouLoading.value = false
    forYouReady.value = true
  }
}

async function loadDaily(force = false) {
  if (!isPlatformPrimary.value || !account.profile.value.loggedIn) {
    dailyTracks.value = []
    dailyReady.value = true
    return
  }
  dailyLoading.value = true
  if (!force) dailyReady.value = false
  try {
    let tracks = await window.wanwu.music.getDailyRecommend().catch(() => [])
    if (force && tracks.length > 1) tracks = shuffleTracks(tracks)
    dailyTracks.value = tracks
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
  albumsLoading.value = true
  if (!force) albumsReady.value = false
  try {
    if (force) albumsSeed.value += 1
    newAlbums.value = await window.wanwu.music.getNewAlbums(16, albumsSeed.value).catch(() => [])
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
  artistsLoading.value = true
  if (!force) artistsReady.value = false
  try {
    if (force) artistsOffset.value += 12
    artistPreview.value = await window.wanwu.music
      .getNeteaseArtistList(12, artistsOffset.value)
      .catch(() => [])
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
  void refreshAccount().then(() =>
    Promise.all([loadForYou(), loadDaily(), loadAlbums(), loadArtists(), loadCharts()])
  )
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
        :refreshing="albumsLoading"
        @refresh="loadAlbums(true)"
        @visible="ensureAlbums"
      >
        <MusicCoverRow
          :items="
            newAlbums.map((a) => ({
              id: a.browseId,
              title: a.title,
              subtitle: a.artist,
              coverUrl: a.coverUrl
            }))
          "
          :loading="albumsLoading || !albumsReady"
          size="album"
          @select="openAlbum"
        />
      </MusicDiscoverSection>

      <MusicDiscoverSection
        lazy
        title="热门歌手"
        :refreshing="artistsLoading"
        @refresh="loadArtists(true)"
        @visible="ensureArtists"
      >
        <MusicCoverRow
          :items="
            artistPreview.map((a) => ({
              id: a.browseId,
              title: a.name,
              coverUrl: a.coverUrl,
              shape: 'circle' as const
            }))
          "
          :loading="artistsLoading || !artistsReady"
          size="artist"
          skeleton-shape="circle"
          @select="openArtist"
        />
      </MusicDiscoverSection>

      <MusicDiscoverSection
        lazy
        title="官方榜单"
        :refreshing="chartsLoading"
        @refresh="loadCharts(true)"
        @visible="ensureCharts"
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
