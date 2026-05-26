import { defaultLinksEntryFolderId } from '@library/links/sources'

const FOLDER_KEY = 'wanwu:links:last-folder-id'

export function readLastLinksFolderId(): string {
  try {
    const id = localStorage.getItem(FOLDER_KEY)?.trim()
    if (id) return id
  } catch {
    /* ignore */
  }
  return defaultLinksEntryFolderId()
}

export function writeLastLinksFolderId(folderId: string): void {
  try {
    localStorage.setItem(FOLDER_KEY, folderId)
  } catch {
    /* ignore */
  }
}

/** 路由未带 folderId 时回退到上次选中的目录 */
export function folderIdFromRoute(param: string | undefined): string {
  return param?.trim() || readLastLinksFolderId()
}
