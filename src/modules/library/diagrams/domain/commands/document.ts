export const DOCUMENT_COMMAND_TYPES = [
  'document.open',
  'document.save',
  'document.saveAs',
  'document.reload',
  'document.export',
  'document.importWfg',
  'document.importDrawio',
  'document.close'
] as const

export type DocumentCommandType = (typeof DOCUMENT_COMMAND_TYPES)[number]

export interface DocumentOpenPayload {
  fileId?: string
  templateId?: string
  /** 为 true 时跳过恢复已存视口，由 fitView 接管 */
  skipViewport?: boolean
}

export interface DocumentSavePayload {
  folderId?: string
  title?: string
  force?: boolean
  /** 自动保存：新文档静默创建文件，不弹系统对话框 */
  auto?: boolean
}

export interface DocumentSaveAsPayload {
  folderId: string
  title?: string
}

export interface DocumentExportPayload {
  pageId?: string
  scope?: 'page' | 'all'
  format: 'png' | 'svg' | 'wfg'
}

export interface DocumentImportWfgPayload {
  discard?: boolean
}

export interface DocumentImportDrawioPayload {
  discard?: boolean
}

export interface DocumentClosePayload {
  discard?: boolean
}
