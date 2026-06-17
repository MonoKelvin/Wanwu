import { ref } from 'vue'
import { watchDebounced } from '@vueuse/core'
import type { FavoriteGroup } from '@shared/types/favorite'
import type { PersonalBackgroundConfig } from '@shared/types/profile'
import { DEFAULT_BACKGROUND_CONFIG } from '@shared/types/profile'
import { normalizeBackgroundConfig } from '@shared/utils/profileMedia'
import {
  fetchFavoriteGroups,
  fetchPersonalProfile,
  savePersonalProfile,
  savePersonalProfileSync,
  type PersonalProfileSnapshot
} from '@modules/personal/services/personalProfileService'

const nickname = ref('')
const bio = ref('')
const savedNickname = ref('')
const savedBio = ref('')
const avatarPath = ref<string | null>(null)
const savedAvatarPath = ref<string | null>(null)
const backgroundPath = ref<string | null>(null)
const savedBackgroundPath = ref<string | null>(null)
const backgroundConfig = ref<PersonalBackgroundConfig>({ ...DEFAULT_BACKGROUND_CONFIG })
const savedBackgroundConfig = ref<PersonalBackgroundConfig>({ ...DEFAULT_BACKGROUND_CONFIG })
const groups = ref<FavoriteGroup[]>([])
const hydrated = ref(false)
const saving = ref(false)

let persistChain: Promise<void> = Promise.resolve()
let favoritesListenerStop: (() => void) | null = null
let uiFlushBeforeLeave: (() => Promise<void>) | null = null

function configsEqual(a: PersonalBackgroundConfig, b: PersonalBackgroundConfig): boolean {
  return (
    JSON.stringify(normalizeBackgroundConfig(a)) === JSON.stringify(normalizeBackgroundConfig(b))
  )
}

export function syncSavedProfileFields() {
  savedNickname.value = nickname.value
  savedBio.value = bio.value
  savedAvatarPath.value = avatarPath.value
  savedBackgroundPath.value = backgroundPath.value
  savedBackgroundConfig.value = normalizeBackgroundConfig({ ...backgroundConfig.value })
}

export function isProfileDirty(): boolean {
  return (
    nickname.value !== savedNickname.value ||
    bio.value !== savedBio.value ||
    avatarPath.value !== savedAvatarPath.value ||
    backgroundPath.value !== savedBackgroundPath.value ||
    !configsEqual(backgroundConfig.value, savedBackgroundConfig.value)
  )
}

function currentProfilePayload() {
  return {
    nickname: nickname.value,
    bio: bio.value,
    avatarPath: avatarPath.value,
    backgroundPath: backgroundPath.value,
    backgroundConfig: backgroundConfig.value
  }
}

export function applyProfileSnapshot(profile: PersonalProfileSnapshot) {
  nickname.value = profile.nickname
  bio.value = profile.bio
  avatarPath.value = profile.avatarPath
  backgroundPath.value = profile.backgroundPath
  backgroundConfig.value = normalizeBackgroundConfig(profile.backgroundConfig)
  syncSavedProfileFields()
}

export async function persistPersonalProfile(): Promise<void> {
  persistChain = persistChain.then(async () => {
    saving.value = true
    try {
      await savePersonalProfile(currentProfilePayload())
      syncSavedProfileFields()
    } finally {
      saving.value = false
    }
  })
  await persistChain
}

function persistPersonalProfileSync(): void {
  if (!isProfileDirty()) return
  savePersonalProfileSync(currentProfilePayload())
  syncSavedProfileFields()
}

export async function loadPersonalProfileFromDb(): Promise<void> {
  const profile = await fetchPersonalProfile()
  if (profile && !isProfileDirty()) {
    applyProfileSnapshot(profile)
  }
}

export async function refreshPersonalFavoriteGroups(): Promise<void> {
  groups.value = await fetchFavoriteGroups()
}

export async function loadPersonalPageData(options?: { respectDirtyProfile?: boolean }): Promise<void> {
  const respectDirty = options?.respectDirtyProfile ?? false

  const profileResult = await fetchPersonalProfile().catch((err) => {
    console.warn('[personal] load profile failed:', err)
    return null
  })
  if (profileResult && (!respectDirty || !isProfileDirty())) {
    applyProfileSnapshot(profileResult)
  }

  try {
    groups.value = await fetchFavoriteGroups()
  } catch (err) {
    console.warn('[personal] load favorite groups failed:', err)
    groups.value = []
  }

  hydrated.value = true
}

/** 页面层在挂载时注册：提交昵称草稿、背景编辑器等 */
export function registerPersonalUiFlush(hook: (() => Promise<void>) | null): () => void {
  uiFlushBeforeLeave = hook
  return () => {
    if (uiFlushBeforeLeave === hook) uiFlushBeforeLeave = null
  }
}

export async function flushPersonalProfileBeforeNavigation(): Promise<void> {
  await uiFlushBeforeLeave?.()
  if (!isProfileDirty()) return
  await persistPersonalProfile()
}

let sessionInitialized = false
let beforeUnloadBound = false

function bindProfilePersistLifecycle(): void {
  watchDebounced(
    [nickname, bio, avatarPath, backgroundPath, backgroundConfig],
    () => {
      if (!hydrated.value || !isProfileDirty()) return
      void persistPersonalProfile()
    },
    { debounce: 600, deep: true }
  )

  if (beforeUnloadBound || typeof window === 'undefined') return
  beforeUnloadBound = true
  window.addEventListener('beforeunload', () => {
    persistPersonalProfileSync()
  })
}

export function initPersonalProfileSession(): void {
  if (sessionInitialized) return
  sessionInitialized = true
  bindProfilePersistLifecycle()
  if (window.wanwu?.user?.onFavoritesChanged) {
    favoritesListenerStop = window.wanwu.user.onFavoritesChanged(() => {
      void refreshPersonalFavoriteGroups()
    })
  }
}

export function usePersonalProfileSession() {
  return {
    nickname,
    bio,
    savedNickname,
    savedBio,
    avatarPath,
    backgroundPath,
    backgroundConfig,
    groups,
    hydrated,
    saving,
    syncSavedProfileFields,
    isProfileDirty,
    applyProfileSnapshot,
    persistPersonalProfile,
    loadPersonalProfileFromDb,
    refreshPersonalFavoriteGroups,
    loadPersonalPageData
  }
}
