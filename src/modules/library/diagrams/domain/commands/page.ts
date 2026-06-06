export const PAGE_COMMAND_TYPES = [
  'page.add',
  'page.rename',
  'page.delete',
  'page.duplicate',
  'page.reorder',
  'page.switch',
  'page.prev',
  'page.next'
] as const

export type PageCommandType = (typeof PAGE_COMMAND_TYPES)[number]

export interface PageAddPayload {
  name?: string
}

export interface PageRenamePayload {
  pageId: string
  name: string
}

export interface PageDeletePayload {
  pageId: string
}

export interface PageDuplicatePayload {
  pageId: string
}

export interface PageReorderPayload {
  pageId: string
  sortOrder: number
}

export interface PageSwitchPayload {
  pageId: string
}
