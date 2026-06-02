<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import EmptyState from '@app/components/EmptyState.vue'
import MusicChartList from '@modules/music/components/MusicChartList.vue'
import MusicCoverRow from '@modules/music/components/MusicCoverRow.vue'
import MusicScrollBody from '@modules/music/components/MusicScrollBody.vue'
import { useMusicSearch, type MusicSearchFilter } from '@modules/music/composables/useMusicSearch'
import { useMusicPlatform } from '@modules/music/composables/useMusicPlatform'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'
import type { NormalizedTrack } from '@shared/types/music'
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

const hasSongResults = computed(() => (search.result?.tracks.length ?? 0) > 0)
const hasAnyResults = computed(() => {
  const r = search.result
  if (!r) return false
  return (
    r.tracks.length > 0 ||
    r.albums.length > 0 ||
    r.artists.length > 0 ||
    (r.playlists?.length ?? 0) > 0
  )
})

const scrollKey = computed(() => {
  const q = search.submittedQuery.trim()
  if (!q) return 'music-search'
  return `music-search:${q}:${search.filter}`
})
</script>

<template>
  <MusicScrollBody variant="search" :scroll-key="scrollKey">
    <div class="ww-music-content-shell">
      <div v-if="search.submittedQuery" class="ww-music-search-results__tabs">
        <div class="ww-music-pill-tabs ww-music-search-filter-tabs" role="tablist">
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
      <div v-if="search.loading" class="ww-music-search-loading">
        <div class="ww-music-search-loading__list ww-music-track-panel">
          <div v-for="n in 8" :key="n" class="ww-music-search-loading__row">
            <div class="ww-music-search-loading__rank" />
            <div class="ww-music-search-loading__cover" />
            <div class="ww-music-search-loading__lines">
              <div class="ww-music-search-loading__line ww-music-search-loading__line--title" />
              <div class="ww-music-search-loading__line ww-music-search-loading__line--sub" />
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="search.error" class="ww-music-error-bar">
        <span>{{ search.error }}</span>
        <button type="button" class="ww-music-retry" @click="search.search()">重试</button>
      </div>

      <template v-else-if="search.result">
        <header v-if="hasAnyResults" class="ww-music-search-results__head">
          <p class="ww-music-search-results__query">
            「{{ search.submittedQuery }}」的搜索结果
          </p>
          <span v-if="hasSongResults" class="ww-music-search-results__count">
            {{ search.result.tracks.length }} 首歌曲
          </span>
        </header>

        <div v-if="!hasAnyResults" class="ww-music-search-results__empty-wrap">
          <EmptyState
            variant="not-found"
            title="未找到结果"
            description="换个关键词或切换分类试试。"
          />
        </div>

        <section v-if="search.filter === 'songs' && hasSongResults" class="ww-music-search-results__section">
          <h3 class="ww-music-section-title">歌曲</h3>
          <div class="ww-music-search-results__panel">
            <MusicChartList
              :tracks="search.result.tracks"
              panel
              show-provider
              @play="play"
            />
          </div>
        </section>

        <section v-if="search.filter === 'albums' && search.result.albums.length" class="ww-music-search-results__section">
          <h3 class="ww-music-section-title">专辑</h3>
          <div class="ww-music-search-results__covers">
            <MusicCoverRow
            :items="
              search.result.albums.map((a) => ({
                id: a.browseId,
                title: a.title,
                subtitle: a.artist,
                coverUrl: a.coverUrl
              }))
            "
            @select="(item) => openAlbum(item.id, item.title)"
          />
          </div>
        </section>

        <section v-if="search.filter === 'artists' && search.result.artists.length" class="ww-music-search-results__section">
          <h3 class="ww-music-section-title">歌手</h3>
          <div class="ww-music-search-results__covers">
            <MusicCoverRow
            :items="
              search.result.artists.map((a) => ({
                id: a.browseId,
                title: a.name,
                coverUrl: a.coverUrl,
                shape: 'circle' as const
              }))
            "
            @select="(item) => openArtist(item.id, item.title, item.coverUrl)"
          />
          </div>
        </section>

        <section
          v-if="search.filter === 'playlists' && (search.result.playlists?.length ?? 0)"
          class="ww-music-search-results__section"
        >
          <h3 class="ww-music-section-title">歌单</h3>
          <div class="ww-music-search-results__covers">
            <MusicCoverRow
            :items="
              (search.result.playlists ?? []).map((p) => ({
                id: p.playlistId,
                title: p.title,
                subtitle: p.trackCount ? `${p.trackCount} 首` : undefined,
                coverUrl: p.coverUrl
              }))
            "
            @select="(item) => openPlaylist(item.id)"
          />
          </div>
        </section>
      </template>
    </div>
  </MusicScrollBody>
</template>

<style scoped>
.ww-music-search-loading {
  min-height: min(40vh, 22rem);
  display: flex;
  flex-direction: column;
}

.ww-music-search-loading__list {
  margin-top: 0.25rem;
  opacity: 0.72;
}

.ww-music-search-loading__row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.55rem 0.85rem;
}

.ww-music-search-loading__rank,
.ww-music-search-loading__cover,
.ww-music-search-loading__line {
  border-radius: 999px;
  background: linear-gradient(
    115deg,
    var(--ww-surface-hover) 0%,
    color-mix(in srgb, var(--ww-surface-hover) 55%, transparent) 45%,
    var(--ww-surface-hover) 90%
  );
  background-size: 200% 200%;
  animation: ww-music-shimmer 1.2s ease-in-out infinite;
}

.ww-music-search-loading__rank {
  width: 1.25rem;
  height: 0.75rem;
}

.ww-music-search-loading__cover {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: var(--ww-music-inner-radius, 0.875rem);
  flex-shrink: 0;
}

.ww-music-search-loading__lines {
  flex: 1;
  min-width: 0;
}

.ww-music-search-loading__line {
  height: 0.55rem;
}

.ww-music-search-loading__line--title {
  width: 58%;
}

.ww-music-search-loading__line--sub {
  width: 36%;
  margin-top: 0.35rem;
}

.ww-music-search-results__tabs {
  display: flex;
  justify-content: center;
  margin-bottom: var(--ww-music-section-gap);
}

.ww-music-search-filter-tabs {
  flex-wrap: nowrap;
}

.ww-music-search-results__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: var(--ww-music-section-gap);
}

.ww-music-search-results__query {
  margin: 0;
  font-size: var(--ww-music-fs-md);
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ww-ink);
}

.ww-music-search-results__count {
  flex-shrink: 0;
  font-size: var(--ww-music-fs-sm);
  color: var(--ww-ink-faint);
}

.ww-music-search-results__section {
  margin-bottom: calc(var(--ww-music-section-gap) + 0.25rem);
}

.ww-music-search-results__section .ww-music-section-title {
  margin: 0 0 var(--ww-music-section-head-gap);
  text-align: center;
}

.ww-music-search-results__panel {
  max-width: 42rem;
  margin: 0 auto;
}

.ww-music-search-results__covers {
  max-width: 52rem;
  margin: 0 auto;
}

.ww-music-search-results__covers :deep(.ww-music-scroll-row) {
  justify-content: center;
}

.ww-music-search-results__covers :deep(.ww-music-card-item) {
  text-align: center;
}

[data-theme='dark'] .ww-music-search-results :deep(.ww-music-track-panel) {
  background: color-mix(in srgb, var(--ww-canvas) 88%, rgb(255 255 255 / 0.04));
  border-color: color-mix(in srgb, var(--ww-border-subtle) 78%, transparent);
}

.ww-music-search-results__empty-wrap {
  display: flex;
  justify-content: center;
  padding: 1.5rem 0 2rem;
}

.ww-music-search-results__empty-wrap :deep(.ww-empty-state) {
  flex: none;
  width: 100%;
  padding: 1rem 0 0.5rem;
}
</style>
