import type { FavoriteEntry, FavoriteGroup } from '@shared/types/favorite'

/** 个人中心 / 收藏 IPC 能力块 */
export interface WanwuUserApi {
  user: {
    getProfile: () => Promise<{
      nickname: string
      bio: string
      avatarPath: string | null
      backgroundPath: string | null
      backgroundConfig: Record<string, unknown> | null
    } | null>
    updateProfile: (profile: {
      nickname: string
      bio: string
      avatarPath?: string | null
      backgroundPath?: string | null
      backgroundConfig?: Record<string, unknown> | null
    }) => Promise<void>
    importProfileImage: (params: {
      kind: 'avatar' | 'background'
      filePath: string
    }) => Promise<{ relativePath: string; url: string | null }>
    clearBackground: () => Promise<void>
    listFavorites: () => Promise<FavoriteEntry[]>
    listFavoriteGroups: () => Promise<FavoriteGroup[]>
    listFavoriteGroupsForPicker: () => Promise<Array<{ id: string; name: string; sortOrder: number }>>
    createFavoriteGroup: (name: string) => Promise<{ id: string; name: string; sortOrder: number }>
    isFavorite: (params: { itemId: string; source: string }) => Promise<boolean>
    addFavorite: (params: { itemId: string; source: string; groupId: string }) => Promise<boolean>
    removeFavorite: (params: { itemId: string; source: string }) => Promise<boolean>
    toggleFavorite: (params: { itemId: string; source: string }) => Promise<boolean>
    onFavoritesChanged: (listener: () => void) => () => void
    isLiked: (params: { itemId: string; source: string }) => Promise<boolean>
    addLike: (params: { itemId: string; source: string }) => Promise<boolean>
    removeLike: (params: { itemId: string; source: string }) => Promise<boolean>
  }
}

declare module '@shared/types/api' {
  interface WanwuApi extends WanwuUserApi {}
}
