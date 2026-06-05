export const DOCUMENT_COMMAND_TYPES = [
  'document.open',
  'document.save',
  'document.saveAs',
  'document.export',
  'document.close'
] as const

export type DocumentCommandType = (typeof DOCUMENT_COMMAND_TYPES)[number]

export interface DocumentOpenPayload {
  fileId?: string
  templateId?: string
}

export interface DocumentSavePayload {
  folderId?: string
  title?: string
}

export interface DocumentSaveAsPayload {
  folderId: string
  title?: string
}

export interface DocumentExportPayload {
  pageId?: string
  format: 'png' | 'svg'
}

export interface DocumentClosePayload {
  discard?: boolean
}
