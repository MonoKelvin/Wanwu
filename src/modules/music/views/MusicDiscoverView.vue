<script setup lang="ts">
import { onActivated, onDeactivated, ref } from 'vue'
import { useRouter } from 'vue-router'
import MusicPageHeading from '@modules/music/components/MusicPageHeading.vue'
import MusicDiscoverSection from '@modules/music/components/MusicDiscoverSection.vue'
import MusicDiscoverTabs from '@modules/music/components/MusicDiscoverTabs.vue'
import MusicLoginBanner from '@modules/music/components/MusicLoginBanner.vue'
import MusicPlatformLoginDialog from '@modules/music/components/MusicPlatformLoginDialog.vue'
import MusicTrackCarousel from '@modules/music/components/MusicTrackCarousel.vue'
import MusicChartList from '@modules/music/components/MusicChartList.vue'
import MusicChartCarousel from '@modules/music/components/MusicChartCarousel.vue'
import { useMusicAccount } from '@modules/music/composables/useMusicAccount'
import { useMusicPlatform } from '@modules/music/composables/useMusicPlatform'
import { useMusicDiscoverStore } from '@modules/music/stores/musicDiscover'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'
import type { DiscoverTabId } from '@modules/music/components/MusicDiscoverTabs.vue'
import type { MusicChartCard, NormalizedTrack } from '@shared/types/music'
import '@modules/music/styles/music-shared.css'

defineOptions({ name: 'MusicDiscoverView' })

const router = useRouter()
const discover = useMusicDiscoverStore()
const player = useMusicPlayerStore()
const account = useMusicAccount()
const { resolvePlaylistBrowseId, platformLabel } = useMusicPlatform()

const activeTab = ref<DiscoverTabId>('featured')
const loginOpen = ref(false)

onActivated(() => {
  void discover.ensureLoaded()
  void player.refreshFavorites()
  discover.startAutoRefresh()
})

onDeactivated(() => {
  discover.stopAutoRefresh()
})

function playFrom(tracks: NormalizedTrack[], track: NormalizedTrack) {
  void player.playTrack(track, tracks.length ? tracks : [track])
}

function openPlaylist(card: MusicChartCard) {
  const id = (card.playlistId ?? card.browseId)?.trim()
  if (!id) return
  const playlistId = resolvePlaylistBrowseId(id)
  if (!playlistId) return
  void router.push({ name: 'music-playlist', params: { playlistId } })
}

function sectionLoading(section: { loaded: boolean; loading: boolean; refreshing: boolean }) {
  return !section.loaded || section.loading || section.refreshing
}

function sectionError(section: { error: string | null }) {
  return section.error
}

function retrySection(key: Parameters<typeof discover.refreshSection>[0]) {
  void discover.refreshSection(key)
}

function openDaily() {
  void router.push({ name: 'music-daily' })
}

function openCloud() {
  void router.push({ name: 'music-cloud' })
}

const showLoginBanner = () =>
  account.hasPlatformAccount.value && !account.profile.value.loggedIn
</script>

<template>
  <div class="ww-music-tab-body ww-scroll-main">
    <div class="ww-music-content-shell">
      <MusicPageHeading title="发现" subtitle="榜单 · 新歌 · 歌单" />

      <MusicDiscoverTabs v-model="activeTab" />

      <!-- 精选：公开内容 -->
      <template v-if="activeTab === 'featured'">
        <div v-if="sectionError(discover.chartPlaylists)" class="ww-music-section-error">
          <span>{{ discover.chartPlaylists.error }}</span>
          <button type="button" class="text-ww-accent" @click="retrySection('chartPlaylists')">重试</button>
        </div>
        <MusicDiscoverSection
          title="精选歌单"
          :refreshing="discover.chartPlaylists.refreshing"
          @refresh="discover.refreshSection('chartPlaylists')"
        >
          <div
            v-if="sectionLoading(discover.chartPlaylists)"
            class="ww-music-discover-playlist-skeleton ww-music-skeleton"
          >
            <div v-for="n in 5" :key="n" class="ww-music-skeleton__discover-card">
              <div class="ww-music-skeleton__discover-cover" />
              <div class="ww-music-skeleton__discover-line ww-music-skeleton__discover-line--title" />
            </div>
          </div>
          <MusicChartCarousel
            v-else-if="discover.chartPlaylists.data.length"
            :cards="discover.chartPlaylists.data"
            @select="openPlaylist"
          />
          <p v-else class="text-sm text-ww-ink-faint">暂无歌单数据</p>
        </MusicDiscoverSection>

        <div v-if="sectionError(discover.chartTracks)" class="ww-music-section-error">
          <span>{{ discover.chartTracks.error }}</span>
          <button type="button" class="text-ww-accent" @click="retrySection('chartTracks')">重试</button>
        </div>
        <MusicDiscoverSection
          title="排行榜"
          :refreshing="discover.chartTracks.refreshing"
          @refresh="discover.refreshSection('chartTracks')"
        >
          <MusicChartList
            :tracks="discover.chartTracks.data"
            :loading="sectionLoading(discover.chartTracks)"
            panel
            @play="(t) => playFrom(discover.chartTracks.data, t)"
          />
        </MusicDiscoverSection>
      </template>

      <!-- 推荐：个性化 + 登录引导 -->
      <template v-else-if="activeTab === 'recommend'">
        <MusicLoginBanner
          v-if="showLoginBanner()"
          :platform-label="platformLabel"
          @login="loginOpen = true"
        />

        <MusicDiscoverSection
          title="为你推荐"
          :refreshing="discover.forYou.refreshing"
          @refresh="discover.refreshSection('forYou')"
        >
          <MusicTrackCarousel
            :tracks="discover.forYou.data"
            :loading="sectionLoading(discover.forYou)"
            @play="(t) => playFrom(discover.forYou.data, t)"
          />
          <p
            v-if="discover.forYou.loaded && !discover.forYou.data.length && !discover.forYou.loading"
            class="text-sm text-ww-ink-faint"
          >
            暂无推荐，{{ showLoginBanner() ? '登录后刷新试试' : '稍后再试' }}。
          </p>
        </MusicDiscoverSection>

        <MusicDiscoverSection
          title="热门趋势"
          :refreshing="discover.trending.refreshing"
          @refresh="discover.refreshSection('trending')"
        >
          <MusicTrackCarousel
            :tracks="discover.trending.data"
            :loading="sectionLoading(discover.trending)"
            @play="(t) => playFrom(discover.trending.data, t)"
          />
        </MusicDiscoverSection>
      </template>

      <!-- 新歌 -->
      <template v-else-if="activeTab === 'new'">
        <MusicDiscoverSection
          title="新上线"
          :refreshing="discover.newReleases.refreshing"
          @refresh="discover.refreshSection('newReleases')"
        >
          <MusicTrackCarousel
            :tracks="discover.newReleases.data"
            :loading="sectionLoading(discover.newReleases)"
            @play="(t) => playFrom(discover.newReleases.data, t)"
          />
          <p
            v-if="discover.newReleases.loaded && !discover.newReleases.data.length"
            class="text-sm text-ww-ink-faint"
          >
            暂无新歌数据
          </p>
        </MusicDiscoverSection>
      </template>

      <!-- 更多：日推/云盘入口 -->
      <template v-else>
        <div class="ww-music-discover-more-grid">
          <button type="button" class="ww-music-discover-more-card" @click="openDaily">
            <p class="ww-music-discover-more-card__title">每日推荐</p>
            <p class="ww-music-discover-more-card__desc">
              {{ platformLabel ? `${platformLabel} 日推，需登录` : '平台日推' }}
            </p>
          </button>
          <button type="button" class="ww-music-discover-more-card" @click="openCloud">
            <p class="ww-music-discover-more-card__title">音乐云盘</p>
            <p class="ww-music-discover-more-card__desc">
              {{ platformLabel ? `${platformLabel} 云盘，需登录` : '平台云盘' }}
            </p>
          </button>
        </div>
      </template>
    </div>
    <MusicPlatformLoginDialog v-model:visible="loginOpen" @success="() => account.refresh()" />
  </div>
</template>

<style scoped>
.ww-music-discover-playlist-skeleton {
  --ww-music-card-size: 8.75rem;
  display: flex;
  gap: var(--ww-music-card-gap);
  overflow: hidden;
}

.ww-music-discover-playlist-skeleton .ww-music-skeleton__discover-card {
  flex: 0 0 var(--ww-music-card-size);
  width: var(--ww-music-card-size);
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.ww-music-discover-playlist-skeleton .ww-music-skeleton__discover-cover {
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--ww-music-inner-radius, 0.875rem);
  background: linear-gradient(
    115deg,
    var(--ww-surface-hover) 0%,
    color-mix(in srgb, var(--ww-surface-hover) 55%, transparent) 45%,
    var(--ww-surface-hover) 90%
  );
  background-size: 200% 200%;
  animation: ww-music-shimmer 1.2s ease-in-out infinite;
}

.ww-music-discover-playlist-skeleton .ww-music-skeleton__discover-line {
  height: 0.5rem;
  margin-top: 0.35rem;
  border-radius: 999px;
  background: var(--ww-surface-hover);
  animation: ww-music-shimmer 1.2s ease-in-out infinite;
}

.ww-music-discover-playlist-skeleton .ww-music-skeleton__discover-line--title {
  width: 88%;
  align-self: center;
}
</style>
