import type { PersonalBackgroundConfig } from '@shared/types/profile'
import type { FavoriteGroup } from '@shared/types/favorite'
import { profileConfigForIpc } from '@shared/utils/profileMedia'

export interface PersonalProfileSnapshot {
  nickname: string
  bio: string
  avatarPath: string | null
  backgroundPath: string | null
  backgroundConfig: PersonalBackgroundConfig | null
}

export async function fetchPersonalProfile(): Promise<PersonalProfileSnapshot | null> {
  const profile = await window.wanwu.user.getProfile()
  if (!profile) return null
  return {
    nickname: profile.nickname,
    bio: profile.bio,
    avatarPath: profile.avatarPath,
    backgroundPath: profile.backgroundPath,
    backgroundConfig: (profile.backgroundConfig as PersonalBackgroundConfig | null) ?? null
  }
}

export async function savePersonalProfile(input: {
  nickname: string
  bio: string
  avatarPath: string | null
  backgroundPath: string | null
  backgroundConfig: PersonalBackgroundConfig
}): Promise<void> {
  await window.wanwu.user.updateProfile({
    nickname: input.nickname,
    bio: input.bio,
    avatarPath: input.avatarPath,
    backgroundPath: input.backgroundPath,
    backgroundConfig: profileConfigForIpc(input.backgroundConfig)
  })
}

export async function fetchFavoriteGroups(): Promise<FavoriteGroup[]> {
  return window.wanwu.user.listFavoriteGroups()
}
