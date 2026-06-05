/** 系统分组 ID（TRD §2.4） */
export const DG_HOME = 'dg-home'
export const DG_DRAFTS = 'dg-drafts'
export const DG_FILES = 'dg-files'
export const DG_RECYCLE = 'dg-recycle'

export const DG_SYSTEM_FOLDER_IDS = [DG_HOME, DG_DRAFTS, DG_FILES, DG_RECYCLE] as const

export type DiagramSystemFolderId = (typeof DG_SYSTEM_FOLDER_IDS)[number]

export function isDiagramSystemFolderId(id: string): id is DiagramSystemFolderId {
  return (DG_SYSTEM_FOLDER_IDS as readonly string[]).includes(id)
}

export function isDiagramCustomFolderId(id: string): boolean {
  return id.startsWith('dg-custom-')
}

export function isDiagramVirtualHomeFolder(id: string): boolean {
  return id === DG_HOME
}
