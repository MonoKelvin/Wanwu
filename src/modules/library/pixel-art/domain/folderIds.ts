export const PA_HOME = 'pa-home'
export const PA_FILES = 'pa-files'
export const PA_RECYCLE = 'pa-recycle'

export const PA_SYSTEM_FOLDER_IDS = [PA_HOME, PA_FILES, PA_RECYCLE] as const

export type PixelSystemFolderId = (typeof PA_SYSTEM_FOLDER_IDS)[number]

export function isPixelSystemFolderId(id: string): id is PixelSystemFolderId {
  return (PA_SYSTEM_FOLDER_IDS as readonly string[]).includes(id)
}

export function isPixelCustomFolderId(id: string): boolean {
  return id.startsWith('pa-custom-')
}

export function isPixelVirtualHomeFolder(id: string): boolean {
  return id === PA_HOME
}
