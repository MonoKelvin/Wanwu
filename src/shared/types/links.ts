export interface LinkFolder {
  id: string
  parentId: string | null
  name: string
  sortOrder: number
  source: 'edge' | 'local' | 'system'
  externalPath: string | null
  isRecycleBin: boolean
  children?: LinkFolder[]
}

export interface LinkBookmark {
  id: string
  folderId: string
  title: string
  url: string
  sortOrder: number
  deleted: boolean
  source: 'edge' | 'local'
  externalId: string | null
  userCreated: boolean
  unreachable: boolean | null
  faviconUrl?: string | null
}

export interface LinksSyncResult {
  added: number
  updated: number
  skippedDeleted: number
  pushedToBrowser: number
}
