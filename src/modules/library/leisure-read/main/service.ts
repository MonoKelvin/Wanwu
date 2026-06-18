import type Database from 'better-sqlite3'
import { readLeisureReadModuleSettings } from '@modules/library/leisure-read/domain/settings'
import { leisureReadHttpFetch } from '@modules/library/leisure-read/main/httpFetch'
import { LeisureReadFavoriteStorage } from '@modules/library/leisure-read/main/favoriteStorage'
import { fetchViaProviderChain } from '@modules/library/leisure-read/providers/registry'
import type {
  LeisureReadContent,
  LeisureReadFavorite,
  LeisureReadFavoriteInput,
  LeisureReadTabId,
  LeisureReadUpdateArticleSnippetsInput
} from '@modules/library/leisure-read/domain/types'

interface UserDatabaseHost {
  withUserDatabase<T>(fn: (db: Database.Database) => T): T
}

interface SettingsGateway {
  getAppSettings(): Record<string, unknown>
}

export class LeisureReadService {
  private favorites: LeisureReadFavoriteStorage

  constructor(
    dbHost: UserDatabaseHost,
    private readonly userData: SettingsGateway
  ) {
    this.favorites = new LeisureReadFavoriteStorage(
      dbHost.withUserDatabase((userDb) => userDb)
    )
  }

  private getSettings() {
    return readLeisureReadModuleSettings(this.userData.getAppSettings())
  }

  async fetch(tab: LeisureReadTabId): Promise<LeisureReadContent> {
    return fetchViaProviderChain(tab, this.getSettings(), leisureReadHttpFetch)
  }

  listFavorites(tab?: LeisureReadTabId): LeisureReadFavorite[] {
    return this.favorites.listFavorites(tab)
  }

  addFavorite(input: LeisureReadFavoriteInput): LeisureReadFavorite {
    return this.favorites.addFavorite(input)
  }

  removeFavorite(id: string): boolean {
    return this.favorites.removeFavorite(id)
  }

  updateArticleSnippetRanges(
    input: LeisureReadUpdateArticleSnippetsInput
  ): LeisureReadFavorite | null {
    return this.favorites.updateArticleSnippetRanges(input)
  }

  isFavorite(tab: LeisureReadTabId, contentId: string): boolean {
    return this.favorites.isFavorite(tab, contentId)
  }

  searchFavorites(query: string, limit?: number): LeisureReadFavorite[] {
    return this.favorites.searchFavorites(query, limit)
  }
}

export function createLeisureReadService(
  dbHost: UserDatabaseHost,
  userData: SettingsGateway
): LeisureReadService {
  return new LeisureReadService(dbHost, userData)
}
