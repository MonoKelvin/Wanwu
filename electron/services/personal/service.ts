/** 个人中心：资料、收藏分组与聚合（业务层，不直接暴露 IPC） */
import { DEFAULT_FAVORITE_GROUP_ID, type DatabaseService } from '../core/database'
import type { LibraryService } from '../library/service'
import type { MediaService } from '../media/service'
import { importProfileImage, removeProfileFile } from '../media/userProfile'
import { toWanwuMediaUrl } from '../media/wanwu'
import type { UserDataGateway } from '../storage/userDataGateway'
import type {
  FavoriteEntryDto,
  FavoriteGroupDto,
  FavoriteGroupPickerDto,
  FavoriteItemPreviewDto
} from './types'

export type { FavoriteEntryDto, FavoriteGroupDto, FavoriteGroupPickerDto } from './types'

export class PersonalService {
  constructor(
    private readonly db: DatabaseService,
    private readonly library: LibraryService,
    private readonly userData: UserDataGateway,
    private readonly media: MediaService | null
  ) {}

  getProfile() {
    return this.userData.getProfile()
  }

  updateProfile(profile: {
    nickname: string
    bio: string
    avatarPath?: string | null
    backgroundPath?: string | null
    backgroundConfig?: Record<string, unknown> | null
  }): void {
    this.userData.updateProfile(profile)
  }

  importProfileImage(params: { kind: 'avatar' | 'background'; filePath: string }) {
    if (!this.media) throw new Error('服务未就绪')
    const relativePath = importProfileImage(this.media, params.kind, params.filePath)
    const profile = this.getProfile()
    if (!profile) throw new Error('用户资料不存在')

    if (params.kind === 'avatar') {
      if (profile.avatarPath && profile.avatarPath !== relativePath) {
        removeProfileFile(this.media, profile.avatarPath)
      }
      this.updateProfile({
        nickname: profile.nickname,
        bio: profile.bio,
        avatarPath: relativePath
      })
    } else {
      this.updateProfile({
        nickname: profile.nickname,
        bio: profile.bio,
        backgroundPath: relativePath,
        backgroundConfig: profile.backgroundConfig ?? {
          scale: 1,
          offsetX: 0,
          offsetY: 0,
          opacity: 1,
          crop: null
        }
      })
    }

    return { relativePath, url: toWanwuMediaUrl(relativePath) }
  }

  clearBackground(): void {
    if (!this.media) return
    const profile = this.getProfile()
    if (!profile?.backgroundPath) return
    removeProfileFile(this.media, profile.backgroundPath)
    this.updateProfile({
      nickname: profile.nickname,
      bio: profile.bio,
      backgroundPath: null,
      backgroundConfig: null
    })
  }

  listFavoriteGroupsForPicker(): FavoriteGroupPickerDto[] {
    return this.db.listFavoriteGroups().map((g) => ({
      id: g.id,
      name: g.name,
      sortOrder: g.sort_order
    }))
  }

  createFavoriteGroup(name: string): FavoriteGroupPickerDto {
    return this.db.createFavoriteGroup(name)
  }

  isFavorite(itemId: string, source: string): boolean {
    return this.db.isFavorite(itemId, source)
  }

  addFavorite(itemId: string, source: string, groupId: string): boolean {
    return this.db.addFavorite(itemId, source, groupId)
  }

  removeFavorite(itemId: string, source: string): boolean {
    return this.db.removeFavorite(itemId, source)
  }

  toggleFavorite(itemId: string, source: string): boolean {
    return this.db.toggleFavorite(itemId, source)
  }

  isLiked(itemId: string, source: string): boolean {
    return this.db.isLiked(itemId, source)
  }

  addLike(itemId: string, source: string): boolean {
    return this.db.addLike(itemId, source)
  }

  removeLike(itemId: string, source: string): boolean {
    return this.db.removeLike(itemId, source)
  }

  listFavoriteEntries(): FavoriteEntryDto[] {
    const rows = this.db.listFavorites()
    const knownGroupIds = new Set(this.db.listFavoriteGroups().map((g) => g.id))
    const libraryIds = rows.filter((r) => r.source !== 'rss').map((r) => r.item_id)
    const libraryItems = this.library.listItemSummariesByIds(libraryIds)
    return rows.map((row) => this.mapFavoriteRow(row, libraryItems, knownGroupIds))
  }

  listFavoriteGroups(): FavoriteGroupDto[] {
    const groups = this.db.listFavoriteGroups()
    const knownGroupIds = new Set(groups.map((g) => g.id))
    const rows = this.db.listFavorites()
    const libraryIds = rows.filter((r) => r.source !== 'rss').map((r) => r.item_id)
    const libraryItems = this.library.listItemSummariesByIds(libraryIds)
    const entries = rows.map((row) => this.mapFavoriteRow(row, libraryItems, knownGroupIds))

    const byGroup = new Map<string, FavoriteEntryDto[]>()
    for (const g of groups) byGroup.set(g.id, [])
    for (const entry of entries) {
      const gid = this.normalizeFavoriteGroupId(entry.groupId, knownGroupIds)
      const list = byGroup.get(gid) ?? []
      list.push({ ...entry, groupId: gid })
      byGroup.set(gid, list)
    }

    const result = groups.map((g) => ({
      id: g.id,
      name: g.name,
      sortOrder: g.sort_order,
      items: byGroup.get(g.id) ?? []
    }))

    const defaultItems = byGroup.get(DEFAULT_FAVORITE_GROUP_ID) ?? []
    if (defaultItems.length > 0 && !result.some((g) => g.id === DEFAULT_FAVORITE_GROUP_ID)) {
      result.unshift({
        id: DEFAULT_FAVORITE_GROUP_ID,
        name: '默认收藏',
        sortOrder: 0,
        items: defaultItems
      })
    }

    return result
  }

  private normalizeFavoriteGroupId(
    groupId: string | null | undefined,
    knownGroupIds: Set<string>
  ): string {
    const trimmed = groupId?.trim()
    if (trimmed && knownGroupIds.has(trimmed)) return trimmed
    return DEFAULT_FAVORITE_GROUP_ID
  }

  private mapFavoriteRow(
    row: {
      id: string
      item_id: string
      source: string
      group_id: string | null
      created_at: string
    },
    libraryItems: Map<string, FavoriteItemPreviewDto>,
    knownGroupIds: Set<string>
  ): FavoriteEntryDto {
    const source = row.source === 'rss' ? 'rss' : 'library'
    const item = source === 'library' ? (libraryItems.get(row.item_id) ?? null) : null

    return {
      id: row.id,
      itemId: row.item_id,
      source,
      groupId: this.normalizeFavoriteGroupId(row.group_id, knownGroupIds),
      createdAt: row.created_at,
      item
    }
  }
}
