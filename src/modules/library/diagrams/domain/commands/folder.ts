export const FOLDER_COMMAND_TYPES = [
  'folder.create',
  'folder.rename',
  'folder.delete',
  'folder.reorder',
  'folder.list'
] as const

export type FolderCommandType = (typeof FOLDER_COMMAND_TYPES)[number]

export interface FolderCreatePayload {
  name: string
}

export interface FolderRenamePayload {
  folderId: string
  name: string
}

export interface FolderDeletePayload {
  folderId: string
}

export interface FolderReorderPayload {
  orders: Array<{ folderId: string; sortOrder: number }>
}
