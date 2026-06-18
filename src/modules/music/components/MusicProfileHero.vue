<script setup lang="ts">
import WwIcon from '@shared/components/WwIcon.vue'
import WwButton from '@shared/components/WwButton.vue'
import MusicCoverArt from '@modules/music/components/MusicCoverArt.vue'
import type { MusicPlatformUserProfile } from '@modules/music/domain/types'

const props = defineProps<{
  profile: MusicPlatformUserProfile
  platformLabel: string
  hasPlatformAccount: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  login: []
  statClick: [tab: 'liked' | 'playlists' | 'collect-artist' | 'collect-album']
}>()

function statLabel(value: number | undefined, fallback = '—') {
  if (value == null) return fallback
  return value > 9999 ? `${(value / 10000).toFixed(1)}万` : String(value)
}
</script>

<template>
  <section class="ww-music-profile-hero">
    <div class="ww-music-profile-hero__avatar">
      <MusicCoverArt
        v-if="profile.avatarUrl"
        :src="profile.avatarUrl"
        :title="profile.nickname"
        size="card"
        shape="circle"
      />
      <div v-else class="ww-music-profile-hero__avatar-fallback" aria-hidden="true">
        <WwIcon name="user" size="lg" />
      </div>
    </div>

    <div class="ww-music-profile-hero__body">
      <template v-if="!hasPlatformAccount">
        <h2 class="ww-music-profile-hero__name">本地库</h2>
        <p class="ww-music-profile-hero__guest">当前主源为 Verome，平台账号功能不可用。可在设置中切换酷狗或网易云。</p>
      </template>

      <template v-else-if="profile.loggedIn">
        <div class="ww-music-profile-hero__name-row">
          <h2 class="ww-music-profile-hero__name">{{ profile.nickname ?? '音乐用户' }}</h2>
          <span v-if="profile.level != null" class="ww-music-profile-hero__badge">Lv.{{ profile.level }}</span>
          <span v-if="profile.vipType && profile.vipType !== 0" class="ww-music-profile-hero__badge is-vip">VIP</span>
        </div>
        <p v-if="profile.signature" class="ww-music-profile-hero__signature">{{ profile.signature }}</p>
        <p v-else class="ww-music-profile-hero__signature">暂无个性签名</p>

        <div v-if="profile.stats" class="ww-music-profile-hero__stats">
          <button type="button" class="ww-music-profile-hero__stat" @click="emit('statClick', 'liked')">
            <strong>{{ statLabel(profile.stats.likedSongCount, '0') }}</strong> 喜欢
          </button>
          <button type="button" class="ww-music-profile-hero__stat" @click="emit('statClick', 'playlists')">
            <strong>{{ statLabel(profile.stats.playlistCount, '0') }}</strong> 歌单
          </button>
          <button
            v-if="profile.stats.artistCount != null"
            type="button"
            class="ww-music-profile-hero__stat"
            @click="emit('statClick', 'collect-artist')"
          >
            <strong>{{ statLabel(profile.stats.artistCount) }}</strong> 歌手
          </button>
          <button
            v-if="profile.stats.albumCount != null"
            type="button"
            class="ww-music-profile-hero__stat"
            @click="emit('statClick', 'collect-album')"
          >
            <strong>{{ statLabel(profile.stats.albumCount) }}</strong> 专辑
          </button>
        </div>
      </template>

      <template v-else>
        <h2 class="ww-music-profile-hero__name">未登录</h2>
        <p class="ww-music-profile-hero__guest">
          登录{{ platformLabel }}后可同步喜欢、歌单、云盘与收藏。
        </p>
      </template>
    </div>

    <div v-if="hasPlatformAccount" class="ww-music-profile-hero__actions">
      <WwButton
        :label="profile.loggedIn ? '管理账号' : '登录'"
        :variant="profile.loggedIn ? 'outlined' : 'primary'"
        size="small"
        :loading="loading"
        @click="emit('login')"
      />
    </div>
  </section>
</template>
