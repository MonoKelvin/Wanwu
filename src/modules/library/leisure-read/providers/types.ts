import type {
  LeisureReadContent,
  LeisureReadTabId
} from '@modules/library/leisure-read/domain/types'

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>

export interface IContentProvider {
  readonly id: string
  fetch(tab: LeisureReadTabId, signal?: AbortSignal): Promise<LeisureReadContent>
}

export type ProviderFactory = (fetchFn: FetchFn) => IContentProvider
