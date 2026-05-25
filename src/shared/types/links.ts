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

export type LinkReachabilityIssue = 'invalid_syntax' | 'network' | 'http_status' | 'timeout'

export interface LinksProbeProgress {
  done: number
  total: number
}

export interface LinksProbeSummary {
  results: Record<string, boolean>
  invalidCount: number
  byIssue: Record<LinkReachabilityIssue, number>
}

export interface LinksSyncResult {
  added: number
  updated: number
  skippedDeleted: number
  /** 浏览器已删除、软件内移入回收站的数量 */
  removed: number
  pushedToBrowser: number
}
