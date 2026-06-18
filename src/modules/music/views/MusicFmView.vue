<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import MusicPageHeading from '@modules/music/components/MusicPageHeading.vue'
import MusicTrackRow from '@modules/music/components/MusicTrackRow.vue'
import MusicFeatureHero from '@modules/music/components/MusicFeatureHero.vue'
import MusicLoginBanner from '@modules/music/components/MusicLoginBanner.vue'
import MusicPlatformLoginDialog from '@modules/music/components/MusicPlatformLoginDialog.vue'
import MusicScrollBody from '@modules/music/components/MusicScrollBody.vue'
import { useMusicAccount } from '@modules/music/composables/useMusicAccount'
import { useMusicPlatform } from '@modules/music/composables/useMusicPlatform'
import { useMusicPlatformRecStore } from '@modules/music/stores/musicPlatformRec'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'
import type { NormalizedTrack } from '@modules/music/domain/types'
import '@modules/music/styles/music-shared.css'

defineOptions({ name: 'MusicFmView' })

const player = useMusicPlayerStore()
const rec = useMusicPlatformRecStore()
const account = useMusicAccount()
const { platformLabel, isPlatformPrimary } = useMusicPlatform()
const loginOpen = ref(false)
const isLoggedIn = computed(() => account.profile.value.loggedIn)

const heroSubtitle = computed(() => {
  if (rec.loadingFm) return '加载中…'
  if (!rec.fmTracks.length) {
    return account.profile.value.loggedIn ? '点击刷新获取推荐' : `登录${platformLabel.value}后体验私人 FM`
  }
  return `${rec.fmTracks.length} 首 · 私人漫游`
})

onMounted(async () => {
  await account.refresh()
  if (account.profile.value.loggedIn) void rec.refreshFm()
})

function onLoginSuccess() {
  void account.refresh().then(() => rec.refreshFm())
}

function play(track: NormalizedTrack) {
  void player.playTrack(track, rec.fmTracks)
}

async function refreshFm() {
  await rec.refreshFm()
}

async function trash(track: NormalizedTrack) {
  await rec.trashFmSong(track.videoId)
  await rec.refreshFm()
}
</script>

<template>
  <MusicScrollBody>
    <div class="ww-music-content-shell">
      <MusicPageHeading title="私人 FM" :subtitle="platformLabel ? `${platformLabel} 私人漫游` : '平台私人 FM'" />

      <MusicFeatureHero title="漫游播放" :subtitle="heroSubtitle" :tracks="rec.fmTracks" />

      <MusicLoginBanner
        v-if="account.hasPlatformAccount && !isLoggedIn && isPlatformPrimary"
        :platform-label="platformLabel"
        title="登录后开启私人 FM"
        description="个性化漫游推荐需登录平台账号。"
        @login="loginOpen = true"
      />

      <div v-if="isLoggedIn" class="ww-music-fm-actions">
        <button type="button" class="ww-music-glass-chip" :disabled="rec.loadingFm" @click="refreshFm">
          {{ rec.loadingFm ? '刷新中…' : '换一批' }}
        </button>
      </div>

      <p v-if="rec.loadingFm" class="ww-music-state-hint">加载中…</p>
      <div v-else-if="rec.fmTracks.length" class="ww-music-fm-list ww-music-track-panel">
        <div v-for="(track, i) in rec.fmTracks" :key="track.trackKey" class="ww-music-fm-list__row">
          <MusicTrackRow
            :track="track"
            :rank="i + 1"
            :playing="player.currentTrack?.trackKey === track.trackKey && player.isPlaying"
            :loading="player.loading && player.currentTrack?.trackKey === track.trackKey"
            show-provider
            @play="play(track)"
          />
          <button type="button" class="ww-music-fm-list__trash" aria-label="不喜欢" @click="trash(track)">
            不喜欢
          </button>
        </div>
      </div>
      <p v-else-if="!isPlatformPrimary" class="ww-music-state-hint">Verome 主源暂不支持平台 FM。</p>
      <p v-else class="ww-music-state-hint">暂无 FM 推荐，登录后刷新试试。</p>
    </div>
    <MusicPlatformLoginDialog v-model:visible="loginOpen" @success="onLoginSuccess" />
  </MusicScrollBody>
</template>

<style scoped>
.ww-music-fm-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.75rem;
}

.ww-music-fm-list__row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 0.5rem;
}

.ww-music-fm-list__trash {
  font-size: 0.75rem;
  color: var(--ww-text-tertiary);
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ww-surface-hover) 80%, transparent);
}

.ww-music-fm-list__trash:hover {
  color: var(--ww-text-secondary);
}
</style>
