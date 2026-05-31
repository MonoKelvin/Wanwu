import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@shared/stores/settings'
import type { MusicPlatformUserProfile } from '@shared/types/music'

const emptyProfile = (platform: 'netease' | 'kugou' | null): MusicPlatformUserProfile => ({
  platform: platform ?? 'kugou',
  loggedIn: false
})

const profile = ref<MusicPlatformUserProfile>(emptyProfile(null))
const loading = ref(false)
const error = ref<string | null>(null)
let watchStarted = false

export function useMusicAccount() {
  const { settings } = storeToRefs(useSettingsStore())

  const platformSource = computed<'netease' | 'kugou' | null>(() => {
    const s = settings.value.musicPrimarySource
    return s === 'kugou' || s === 'netease' ? s : null
  })

  const platformLabel = computed(() => {
    if (platformSource.value === 'kugou') return '酷狗'
    if (platformSource.value === 'netease') return '网易云'
    return ''
  })

  const hasPlatformAccount = computed(() => platformSource.value != null)

  async function applySessionSnapshot() {
    if (!platformSource.value) {
      profile.value = emptyProfile(null)
      return
    }
    try {
      const snap = await window.wanwu.music.getPlatformSessionSnapshot()
      if (snap.nickname || snap.avatarUrl || snap.userId) {
        profile.value = {
          ...profile.value,
          platform: platformSource.value,
          loggedIn: !!snap.userId || profile.value.loggedIn,
          userId: snap.userId ?? profile.value.userId,
          nickname: snap.nickname ?? profile.value.nickname,
          avatarUrl: snap.avatarUrl ?? profile.value.avatarUrl
        }
      }
    } catch {
      /* ignore snapshot errors */
    }
  }

  async function refresh(options?: { skipRefreshLogin?: boolean }) {
    if (!platformSource.value) {
      profile.value = emptyProfile(null)
      return
    }
    loading.value = true
    error.value = null
    try {
      await applySessionSnapshot()
      if (!options?.skipRefreshLogin) {
        await window.wanwu.music.refreshPlatformLogin()
      }
      profile.value = await window.wanwu.music.getPlatformUserProfile()
    } catch (e) {
      error.value = e instanceof Error ? e.message : '账号信息加载失败'
      if (!profile.value.loggedIn) {
        profile.value = { ...emptyProfile(platformSource.value), loggedIn: false }
      }
    } finally {
      loading.value = false
    }
  }

  if (!watchStarted) {
    watchStarted = true
    watch(
      platformSource,
      () => {
        void refresh()
      },
      { immediate: true }
    )
  }

  return {
    profile,
    loading,
    error,
    platformSource,
    platformLabel,
    hasPlatformAccount,
    refresh,
    applySessionSnapshot
  }
}
