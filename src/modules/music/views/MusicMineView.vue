<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WwIcon from '@shared/components/WwIcon.vue'
import WwButton from '@shared/components/WwButton.vue'
import MusicPageHeading from '@modules/music/components/MusicPageHeading.vue'
import MusicChartList from '@modules/music/components/MusicChartList.vue'
import MusicCoverRow from '@modules/music/components/MusicCoverRow.vue'
import MusicProfileHero from '@modules/music/components/MusicProfileHero.vue'
import MusicMineSubscribedGrid from '@modules/music/components/MusicMineSubscribedGrid.vue'
import MusicCloudList from '@modules/music/components/MusicCloudList.vue'
import MusicPlatformLoginDialog from '@modules/music/components/MusicPlatformLoginDialog.vue'
import { useMusicAccount } from '@modules/music/composables/useMusicAccount'
import { useMusicPlatform } from '@modules/music/composables/useMusicPlatform'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'
import type { MusicPlatformSubscribedItem, NormalizedTrack } from '@shared/types/music'
import '@modules/music/styles/music-shared.css'
import '@modules/music/styles/music-mine.css'

defineOptions({ name: 'MusicMineView' })

type MineTab = 'liked' | 'playlists' | 'collect' | 'cloud' | 'local'
type LocalSubTab = 'favorites' | 'history'
type CollectSubTab = 'album' | 'artist' | 'mv' | 'dj'

const route = useRoute()
const router = useRouter()
const player = useMusicPlayerStore()
const account = useMusicAccount()
const { resolvePlaylistBrowseId } = useMusicPlatform()

const activeTab = ref<MineTab>('liked')
const localSubTab = ref<LocalSubTab>('favorites')
const collectSubTab = ref<CollectSubTab>('album')
const loginOpen = ref(false)

const favoriteTracks = ref<NormalizedTrack[]>([])
const historyTracks = ref<NormalizedTrack[]>([])
const likedTracks = ref<NormalizedTrack[]>([])
const cloudTracks = ref<NormalizedTrack[]>([])
const playlists = ref<Array<{ id: string; title: string; coverUrl?: string; creatorName?: string }>>([])
const subscribedItems = ref<MusicPlatformSubscribedItem[]>([])

const loadingLocal = ref(true)
const loadingLiked = ref(false)
const loadingPlaylists = ref(false)
const loadingCloud = ref(false)
const loadingCollect = ref(false)

const platformTabs = computed(() => {
  if (!account.hasPlatformAccount.value) return [{ id: 'local' as const, label: '本地', icon: 'database' as const }]
  return [
    { id: 'liked' as const, label: '喜欢', icon: 'heart' as const },
    { id: 'playlists' as const, label: '歌单', icon: 'list-music' as const },
    { id: 'collect' as const, label: '收藏', icon: 'star' as const },
    { id: 'cloud' as const, label: '云盘', icon: 'inbox' as const },
    { id: 'local' as const, label: '本地', icon: 'database' as const }
  ]
})

const collectSubTabs = computed(() => {
  const caps = account.profile.value.capabilities
  const tabs: Array<{ id: CollectSubTab; label: string; supported: boolean }> = [
    { id: 'album', label: '专辑', supported: caps?.subscribedAlbums !== false },
    { id: 'artist', label: '歌手', supported: caps?.subscribedArtists !== false },
    { id: 'mv', label: '视频', supported: caps?.subscribedMvs !== false },
    { id: 'dj', label: '播客', supported: caps?.subscribedDjs !== false }
  ]
  return tabs
})

const createdPlaylists = computed(() =>
  playlists.value.filter((p) => !p.creatorName || p.creatorName === account.profile.value.nickname)
)
const subscribedPlaylists = computed(() =>
  playlists.value.filter((p) => p.creatorName && p.creatorName !== account.profile.value.nickname)
)

const currentLocalTracks = computed(() =>
  localSubTab.value === 'favorites' ? favoriteTracks.value : historyTracks.value
)

const unsupportedCollectMessage = computed(() => {
  const tab = collectSubTabs.value.find((t) => t.id === collectSubTab.value)
  if (tab && !tab.supported) return `当前平台（${account.platformLabel.value}）暂不支持${tab.label}收藏`
  return ''
})

function syncTabFromRoute() {
  const tab = route.query.tab
  if (tab === 'liked' || tab === 'playlists' || tab === 'collect' || tab === 'cloud' || tab === 'local') {
    activeTab.value = tab
  } else if (tab === 'favorites' || tab === 'history') {
    activeTab.value = 'local'
    localSubTab.value = tab
  } else if (tab === 'netease-liked') {
    activeTab.value = 'liked'
  } else if (tab === 'netease-playlists') {
    activeTab.value = 'playlists'
  }
  const sub = route.query.sub
  if (sub === 'album' || sub === 'artist' || sub === 'mv' || sub === 'dj') collectSubTab.value = sub
}

async function loadFavorites() {
  loadingLocal.value = true
  try {
    const rows = await window.wanwu.music.listFavorites()
    favoriteTracks.value = rows.map((r) => JSON.parse(r.payloadJson) as NormalizedTrack)
    void player.refreshFavorites()
  } finally {
    loadingLocal.value = false
  }
}

function dedupeHistoryTracks(tracks: NormalizedTrack[]): NormalizedTrack[] {
  const seen = new Set<string>()
  const out: NormalizedTrack[] = []
  for (const track of tracks) {
    if (seen.has(track.trackKey)) continue
    seen.add(track.trackKey)
    out.push(track)
  }
  return out
}

async function loadHistory() {
  loadingLocal.value = true
  try {
    const rows = await window.wanwu.music.listHistory(80)
    historyTracks.value = dedupeHistoryTracks(
      rows.map((r) => JSON.parse(r.payloadJson) as NormalizedTrack)
    )
  } finally {
    loadingLocal.value = false
  }
}

async function loadLocalData() {
  await Promise.all([loadFavorites(), loadHistory()])
}

async function loadLiked() {
  if (!account.profile.value.loggedIn) {
    likedTracks.value = []
    return
  }
  loadingLiked.value = true
  try {
    likedTracks.value = await window.wanwu.music.getPlatformLikedTracks(80)
  } finally {
    loadingLiked.value = false
  }
}

async function loadPlaylists() {
  if (!account.profile.value.loggedIn) {
    playlists.value = []
    return
  }
  loadingPlaylists.value = true
  try {
    playlists.value = await window.wanwu.music.getPlatformUserPlaylists()
  } finally {
    loadingPlaylists.value = false
  }
}

async function loadCloud() {
  if (!account.profile.value.loggedIn) {
    cloudTracks.value = []
    return
  }
  loadingCloud.value = true
  try {
    cloudTracks.value = await window.wanwu.music.getPlatformUserCloud(80)
  } finally {
    loadingCloud.value = false
  }
}

async function loadCollect() {
  if (!account.profile.value.loggedIn) {
    subscribedItems.value = []
    return
  }
  const tab = collectSubTabs.value.find((t) => t.id === collectSubTab.value)
  if (tab && !tab.supported) {
    subscribedItems.value = []
    return
  }
  loadingCollect.value = true
  try {
    subscribedItems.value = await window.wanwu.music.getPlatformSubscribed(collectSubTab.value, 40)
  } finally {
    loadingCollect.value = false
  }
}

function loadActiveTabData() {
  if (activeTab.value === 'local') void loadLocalData()
  else if (activeTab.value === 'liked') void loadLiked()
  else if (activeTab.value === 'playlists') void loadPlaylists()
  else if (activeTab.value === 'cloud') void loadCloud()
  else if (activeTab.value === 'collect') void loadCollect()
}

function switchTab(tab: MineTab) {
  activeTab.value = tab
  const query: Record<string, string> =
    tab === 'local'
      ? { tab: localSubTab.value }
      : tab === 'collect'
        ? { tab: 'collect', sub: collectSubTab.value }
        : { tab }
  void router.replace({ name: 'music-mine', query })
  loadActiveTabData()
}

function switchLocalSub(tab: LocalSubTab) {
  localSubTab.value = tab
  void router.replace({ name: 'music-mine', query: { tab } })
}

function switchCollectSub(tab: CollectSubTab) {
  collectSubTab.value = tab
  void router.replace({ name: 'music-mine', query: { tab: 'collect', sub: tab } })
  void loadCollect()
}

function onStatClick(tab: 'liked' | 'playlists' | 'collect-artist' | 'collect-album') {
  if (tab === 'liked') switchTab('liked')
  else if (tab === 'playlists') switchTab('playlists')
  else if (tab === 'collect-artist') {
    activeTab.value = 'collect'
    switchCollectSub('artist')
  } else if (tab === 'collect-album') {
    activeTab.value = 'collect'
    switchCollectSub('album')
  }
}

async function clearHistory() {
  await window.wanwu.music.clearHistory()
  historyTracks.value = []
}

function play(track: NormalizedTrack, list?: NormalizedTrack[]) {
  void player.playTrack(track, list ?? [track])
}

function openPlaylist(id: string) {
  const playlistId = resolvePlaylistBrowseId(id)
  if (!playlistId) return
  void router.push({ name: 'music-playlist', params: { playlistId } })
}

function onLoginSuccess() {
  void account.refresh().then(() => loadActiveTabData())
}

function onLoginDialogClose(open: boolean) {
  if (!open) void account.refresh()
}

watch(
  () => route.query.tab,
  () => {
    syncTabFromRoute()
    loadActiveTabData()
  }
)

watch(
  () => account.profile.value.loggedIn,
  () => {
    if (activeTab.value !== 'local') loadActiveTabData()
  }
)

onMounted(() => {
  syncTabFromRoute()
  void loadLocalData()
  loadActiveTabData()
})
</script>

<template>
  <div class="ww-music-tab-body ww-scroll-main">
    <div class="ww-music-content-shell">
      <MusicPageHeading
        :title="'我的'"
        :subtitle="account.hasPlatformAccount ? `${account.platformLabel} 账号与本地库` : '本地收藏与播放历史'"
      />

      <MusicProfileHero
        :profile="account.profile"
        :platform-label="account.platformLabel"
        :has-platform-account="account.hasPlatformAccount"
        :loading="account.loading"
        @login="loginOpen = true"
        @stat-click="onStatClick"
      />

      <div class="ww-music-mine-toolbar">
        <div class="ww-music-mine-tabs-row">
          <div class="ww-music-mine-tabs">
            <button
              v-for="tab in platformTabs"
              :key="tab.id"
              type="button"
              class="ww-music-mine-tab"
              :class="{ 'is-active': activeTab === tab.id }"
              @click="switchTab(tab.id)"
            >
              <WwIcon :name="tab.icon" size="sm" />
              <span>{{ tab.label }}</span>
            </button>
          </div>

          <div v-if="activeTab === 'local'" class="ww-music-mine-subtabs">
            <button
              type="button"
              class="ww-music-mine-subtab"
              :class="{ 'is-active': localSubTab === 'favorites' }"
              @click="switchLocalSub('favorites')"
            >
              收藏
            </button>
            <button
              type="button"
              class="ww-music-mine-subtab"
              :class="{ 'is-active': localSubTab === 'history' }"
              @click="switchLocalSub('history')"
            >
              历史
            </button>
          </div>

          <div v-if="activeTab === 'collect'" class="ww-music-mine-subtabs">
            <button
              v-for="sub in collectSubTabs"
              :key="sub.id"
              type="button"
              class="ww-music-mine-subtab"
              :class="{ 'is-active': collectSubTab === sub.id }"
              @click="switchCollectSub(sub.id)"
            >
              {{ sub.label }}
            </button>
          </div>
        </div>

        <button
          v-if="activeTab === 'local' && localSubTab === 'history' && historyTracks.length"
          type="button"
          class="ww-music-mine-clear"
          aria-label="清空历史"
          v-tooltip.bottom="'清空历史'"
          @click="clearHistory"
        >
          <WwIcon name="trash-2" size="sm" />
        </button>
      </div>

      <div class="ww-music-mine-panel">
        <!-- 本地 -->
        <template v-if="activeTab === 'local'">
          <p v-if="loadingLocal" class="text-sm text-ww-ink-faint">加载中…</p>
          <MusicChartList
            v-else-if="currentLocalTracks.length"
            :tracks="currentLocalTracks"
            panel
            show-provider
            @play="(t) => play(t, currentLocalTracks)"
          />
          <p v-else-if="localSubTab === 'favorites'" class="text-sm text-ww-ink-faint">
            还没有收藏，播放时点击心形即可收藏。
          </p>
          <p v-else class="text-sm text-ww-ink-faint">暂无播放记录。</p>
        </template>

        <!-- 需登录的平台 Tab -->
        <template v-else-if="account.hasPlatformAccount && !account.profile.loggedIn">
          <div class="ww-music-mine-empty">
            <p class="ww-music-mine-empty__text">登录{{ account.platformLabel }}后可查看{{ activeTab === 'liked' ? '喜欢' : activeTab === 'playlists' ? '歌单' : activeTab === 'cloud' ? '云盘' : '收藏' }}。</p>
            <WwButton label="登录" size="small" @click="loginOpen = true" />
          </div>
        </template>

        <template v-else-if="activeTab === 'liked'">
          <p v-if="loadingLiked" class="text-sm text-ww-ink-faint">加载喜欢…</p>
          <MusicChartList
            v-else-if="likedTracks.length"
            :tracks="likedTracks"
            panel
            show-provider
            @play="(t) => play(t, likedTracks)"
          />
          <p v-else class="text-sm text-ww-ink-faint">还没有喜欢的歌曲。</p>
        </template>

        <template v-else-if="activeTab === 'playlists'">
          <p v-if="loadingPlaylists" class="text-sm text-ww-ink-faint">加载歌单…</p>
          <template v-else-if="playlists.length">
            <div v-if="createdPlaylists.length" class="ww-music-mine-playlist-section">
              <p class="ww-music-mine-section-label">创建的歌单</p>
              <MusicCoverRow
                :items="createdPlaylists.map((p) => ({ id: p.id, title: p.title, coverUrl: p.coverUrl }))"
                @select="(item) => openPlaylist(item.id)"
              />
            </div>
            <div v-if="subscribedPlaylists.length" class="ww-music-mine-playlist-section">
              <p class="ww-music-mine-section-label">收藏的歌单</p>
              <MusicCoverRow
                :items="subscribedPlaylists.map((p) => ({ id: p.id, title: p.title, coverUrl: p.coverUrl }))"
                @select="(item) => openPlaylist(item.id)"
              />
            </div>
          </template>
          <p v-else class="text-sm text-ww-ink-faint">暂无歌单。</p>
        </template>

        <template v-else-if="activeTab === 'collect'">
          <p v-if="unsupportedCollectMessage" class="text-sm text-ww-ink-faint">{{ unsupportedCollectMessage }}</p>
          <p v-else-if="loadingCollect" class="text-sm text-ww-ink-faint">加载收藏…</p>
          <MusicMineSubscribedGrid v-else-if="subscribedItems.length" :items="subscribedItems" />
          <p v-else class="text-sm text-ww-ink-faint">暂无{{ collectSubTabs.find((t) => t.id === collectSubTab)?.label }}收藏。</p>
        </template>

        <template v-else-if="activeTab === 'cloud'">
          <MusicCloudList
            :tracks="cloudTracks"
            :loading="loadingCloud"
            empty-text="云盘为空或当前平台暂不支持云盘。"
            @play="(t) => play(t, cloudTracks)"
          />
        </template>
      </div>

      <MusicPlatformLoginDialog v-model:visible="loginOpen" @success="onLoginSuccess" @update:visible="onLoginDialogClose" />
    </div>
  </div>
</template>
