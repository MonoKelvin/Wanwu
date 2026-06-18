<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import EmptyState from '@app/components/EmptyState.vue'
import MusicChartList from '@modules/music/components/MusicChartList.vue'
import MusicCover from '@modules/music/components/MusicCover.vue'
import MusicPageHeading from '@modules/music/components/MusicPageHeading.vue'
import MusicScrollBody from '@modules/music/components/MusicScrollBody.vue'
import { useMusicSearch, type MusicSearchFilter } from '@modules/music/composables/useMusicSearch'
import { useMusicPlatform } from '@modules/music/composables/useMusicPlatform'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'
import type { NormalizedTrack } from '@modules/music/domain/types'
import '@modules/music/styles/music-shared.css'

const router = useRouter()
const player = useMusicPlayerStore()
const search = useMusicSearch()
const { resolvePlaylistBrowseId } = useMusicPlatform()

const filterOptions: Array<{ label: string; value: MusicSearchFilter }> = [
  { label: '单曲', value: 'songs' },
  { label: '专辑', value: 'albums' },
  { label: '歌手', value: 'artists' },
  { label: '歌单', value: 'playlists' }
]

const filterUnit: Record<MusicSearchFilter, string> = {
  songs: '首歌曲',
  albums: '张专辑',
  artists: '位歌手',
  playlists: '个歌单'
}

function play(track: NormalizedTrack, _index: number) {
  const list = search.result?.tracks ?? []
  void player.playTrack(track, list.length ? list : [track])
}

function openAlbum(browseId: string, title?: string) {
  void router.push({
    name: 'music-album',
    params: { browseId },
    query: title ? { title } : undefined
  })
}

function openArtist(browseId: string, name?: string, coverUrl?: string) {
  void router.push({
    name: 'music-artist',
    params: { browseId },
    query: {
      ...(name ? { name } : {}),
      ...(coverUrl ? { cover: coverUrl } : {})
    }
  })
}

function openPlaylist(playlistId: string) {
  const browseId = resolvePlaylistBrowseId(playlistId)
  if (!browseId) return
  void router.push({ name: 'music-playlist', params: { playlistId: browseId } })
}

const activeCount = computed(() => {
  const r = search.result
  if (!r) return 0
  switch (search.filter) {
    case 'songs':
      return r.tracks.length
    case 'albums':
      return r.albums.length
    case 'artists':
      return r.artists.length
    case 'playlists':
      return r.playlists?.length ?? 0
  }
})

const hasFilterResults = computed(() => activeCount.value > 0)

const pageSubtitle = computed(() => {
  if (search.loading && !search.result) return '正在搜索…'
  if (search.loading && search.result) return '加载中…'
  if (!search.result || !hasFilterResults.value) return undefined
  return `${activeCount.value} ${filterUnit[search.filter]}`
})

const showInitialLoading = computed(() => search.loading && !search.result)
const showFilterLoading = computed(() => search.loading && !!search.result)

const albumItems = computed(() =>
  (search.result?.albums ?? []).map((a) => ({
    id: a.browseId,
    title: a.title,
    subtitle: a.artist,
    coverUrl: a.coverUrl
  }))
)

const artistItems = computed(() =>
  (search.result?.artists ?? []).map((a) => ({
    id: a.browseId,
    title: a.name,
    coverUrl: a.coverUrl
  }))
)

const playlistItems = computed(() =>
  (search.result?.playlists ?? []).map((p) => ({
    id: p.playlistId,
    title: p.title,
    subtitle: p.trackCount ? `${p.trackCount} 首` : undefined,
    coverUrl: p.coverUrl
  }))
)

const scrollKey = computed(() => {
  const q = search.submittedQuery.trim()
  if (!q) return 'music-search'
  return `music-search:${q}:${search.filter}`
})
</script>

<template>
  <div class="ww-music-search-layout">
    <header v-if="search.submittedQuery" class="ww-music-search-layout__header">
      <div class="ww-music-content-shell ww-music-search-page">
        <div class="ww-music-search-page__heading">
          <MusicPageHeading :title="search.submittedQuery" :subtitle="pageSubtitle" />
        </div>

        <div class="ww-music-search-tabs" role="tablist" aria-label="搜索分类">
          <div class="ww-music-pill-tabs">
            <button
              v-for="opt in filterOptions"
              :key="opt.value"
              type="button"
              class="ww-music-pill-tabs__btn"
              :class="{ 'is-active': search.filter === opt.value }"
              role="tab"
              :aria-selected="search.filter === opt.value"
              @click="search.setFilter(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <MusicScrollBody
      variant="search"
      class="ww-music-search-layout__body"
      :scroll-key="scrollKey"
    >
      <div class="ww-music-content-shell">
        <div v-if="showInitialLoading" class="ww-music-search-loading" aria-busy="true">
          <div
            v-if="search.filter === 'songs'"
            class="ww-music-search-loading__list ww-music-track-panel"
          >
            <div v-for="n in 8" :key="n" class="ww-music-search-loading__row">
              <div class="ww-music-search-loading__cover" />
              <div class="ww-music-search-loading__lines">
                <div class="ww-music-search-loading__line ww-music-search-loading__line--title" />
                <div class="ww-music-search-loading__line ww-music-search-loading__line--sub" />
              </div>
            </div>
          </div>
          <div
            v-else
            class="ww-music-search-loading__grid"
            :class="{ 'is-artist': search.filter === 'artists' }"
          >
            <div v-for="n in 8" :key="n" class="ww-music-search-loading__grid-card">
              <div
                class="ww-music-search-loading__grid-cover"
                :class="{ 'is-circle': search.filter === 'artists' }"
              />
              <div class="ww-music-search-loading__line ww-music-search-loading__line--title" />
            </div>
          </div>
        </div>

        <div v-else-if="search.error" class="ww-music-error-bar">
          <span>{{ search.error }}</span>
          <button type="button" class="ww-music-retry" @click="search.search(undefined, { skipCache: true })">
            重试
          </button>
        </div>

        <div
          v-else-if="search.result"
          class="ww-music-search-pane"
          :class="{ 'is-loading': showFilterLoading }"
        >
          <div v-if="!hasFilterResults" class="ww-music-search-empty">
            <EmptyState
              variant="not-found"
              title="未找到结果"
              description="换个关键词或切换分类试试。"
            />
          </div>

          <div v-else-if="search.filter === 'songs'" class="ww-music-search-pane__tracks">
            <MusicChartList
              :tracks="search.result.tracks"
              panel
              show-provider
              @play="play"
            />
          </div>

          <div v-else-if="search.filter === 'albums'" class="ww-music-search-grid">
            <button
              v-for="item in albumItems"
              :key="item.id"
              type="button"
              class="ww-music-search-grid__item"
              @click="openAlbum(item.id, item.title)"
            >
              <div class="ww-music-search-grid__cover">
                <MusicCover :src="item.coverUrl" :title="item.title" size="card" />
              </div>
              <span class="ww-music-search-grid__title ww-music-text-ellipsis">{{ item.title }}</span>
              <span v-if="item.subtitle" class="ww-music-search-grid__sub ww-music-text-ellipsis">
                {{ item.subtitle }}
              </span>
            </button>
          </div>

          <div v-else-if="search.filter === 'artists'" class="ww-music-search-grid ww-music-search-grid--artist">
            <button
              v-for="item in artistItems"
              :key="item.id"
              type="button"
              class="ww-music-search-grid__item"
              @click="openArtist(item.id, item.title, item.coverUrl)"
            >
              <div class="ww-music-search-grid__cover">
                <MusicCover :src="item.coverUrl" :title="item.title" size="card" shape="circle" />
              </div>
              <span class="ww-music-search-grid__title ww-music-text-ellipsis">{{ item.title }}</span>
            </button>
          </div>

          <div v-else-if="search.filter === 'playlists'" class="ww-music-search-grid">
            <button
              v-for="item in playlistItems"
              :key="item.id"
              type="button"
              class="ww-music-search-grid__item"
              @click="openPlaylist(item.id)"
            >
              <div class="ww-music-search-grid__cover">
                <MusicCover :src="item.coverUrl" :title="item.title" size="card" />
              </div>
              <span class="ww-music-search-grid__title ww-music-text-ellipsis">{{ item.title }}</span>
              <span v-if="item.subtitle" class="ww-music-search-grid__sub ww-music-text-ellipsis">
                {{ item.subtitle }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </MusicScrollBody>
  </div>
</template>

<style scoped>
.ww-music-search-loading {
  min-height: min(34vh, 20rem);
}

.ww-music-search-loading__list {
  opacity: 0.72;
}

.ww-music-search-loading__row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.95rem;
}

.ww-music-search-loading__cover,
.ww-music-search-loading__line,
.ww-music-search-loading__grid-cover {
  border-radius: var(--ww-music-inner-radius);
  background: linear-gradient(
    115deg,
    var(--ww-surface-hover) 0%,
    color-mix(in srgb, var(--ww-surface-hover) 55%, transparent) 45%,
    var(--ww-surface-hover) 90%
  );
  background-size: 200% 200%;
  animation: ww-music-shimmer 1.2s ease-in-out infinite;
}

.ww-music-search-loading__cover {
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
}

.ww-music-search-loading__lines {
  flex: 1;
  min-width: 0;
}

.ww-music-search-loading__line {
  height: 0.55rem;
  border-radius: 999px;
}

.ww-music-search-loading__line--title {
  width: 58%;
}

.ww-music-search-loading__line--sub {
  width: 36%;
  margin-top: 0.4rem;
}

.ww-music-search-loading__grid-card {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.ww-music-search-loading__grid-cover {
  width: 100%;
  aspect-ratio: 1;
}

.ww-music-search-loading__grid-cover.is-circle {
  border-radius: var(--ww-radius-full);
  max-width: 6rem;
  margin-inline: auto;
}

.ww-music-search-loading__grid-card .ww-music-search-loading__line--title {
  width: 72%;
}

@media (prefers-reduced-motion: reduce) {
  .ww-music-search-loading__cover,
  .ww-music-search-loading__line,
  .ww-music-search-loading__grid-cover {
    animation: none;
  }
}
</style>
