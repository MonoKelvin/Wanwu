import { useAppStore } from '@shared/stores/app'
import { readLastLinksFolderId } from '@modules/library/links/lib/linksRouteMemory'

/** 进入链接大分类时恢复上次路径（含 folderId） */
export function resolveLinksEntryTarget():
  | string
  | { name: 'library-links'; params: { folderId: string } } {
  const last = useAppStore().lastPathByModule.library
  if (last.includes('/library/links')) return last
  return { name: 'library-links', params: { folderId: readLastLinksFolderId() } }
}
