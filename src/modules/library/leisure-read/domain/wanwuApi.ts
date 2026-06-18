import type {
  LeisureReadContent,
  LeisureReadFavorite,
  LeisureReadFavoriteInput,
  LeisureReadTabId,
  LeisureReadUpdateArticleSnippetsInput
} from '@modules/library/leisure-read/domain/types'

export interface WanwuLeisureReadApi {
  leisureRead: {
    fetch: (params: { tab: LeisureReadTabId }) => Promise<LeisureReadContent>
    listFavorites: (params?: { tab?: LeisureReadTabId }) => Promise<LeisureReadFavorite[]>
    addFavorite: (input: LeisureReadFavoriteInput) => Promise<LeisureReadFavorite>
    removeFavorite: (params: { id: string }) => Promise<boolean>
    updateArticleSnippets: (
      input: LeisureReadUpdateArticleSnippetsInput
    ) => Promise<LeisureReadFavorite | null>
    isFavorite: (params: { tab: LeisureReadTabId; contentId: string }) => Promise<boolean>
    searchFavorites: (params: { query: string; limit?: number }) => Promise<LeisureReadFavorite[]>
  }
}

declare module '@shared/types/api' {
  interface WanwuApi extends WanwuLeisureReadApi {}
}
