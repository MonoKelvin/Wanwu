/** 流程图模块共享类型（IPC、Store、命令层共用） */

export type DiagramFolderKind = 'system' | 'custom'

export interface DiagramFolder {
  id: string
  name: string
  kind: DiagramFolderKind
  parentId: string | null
  sortOrder: number
  createdAt: string
  deletedAt: string | null
}

export interface DiagramFileMeta {
  id: string
  folderId: string
  title: string
  pageCount: number
  thumbnailPath: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface DiagramPage {
  id: string
  name: string
  sortOrder: number
  viewport: { x: number; y: number; zoom: number }
  graphData: DiagramGraphData
}

export interface DiagramGraphData {
  nodes: unknown[]
  edges: unknown[]
}

export interface DiagramContentMeta {
  title: string
  defaultPageId: string
}

export interface DiagramContent {
  format: 'wanwu-diagram'
  formatVersion: 1
  engine: 'logicflow'
  engineVersion: string
  meta: DiagramContentMeta
  pages: DiagramPage[]
}

export interface DiagramFileRecord {
  meta: DiagramFileMeta
  content: DiagramContent
}

export type WriteResult =
  | { ok: true; updatedAt: string }
  | { ok: false; reason: 'conflict' | 'not_found' | 'error'; message?: string }

export interface DiagramTemplate {
  id: string
  name: string
  description: string
  content: DiagramContent
}
