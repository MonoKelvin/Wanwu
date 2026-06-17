/**
 * 流程图模块领域类型（IPC、Store、命令层、Electron 共用）。
 * DiagramCanvasSettings 与编辑器选择层共用定义，避免重复。
 */
import type { DiagramCanvasSettings } from '@modules/library/diagrams/lib/diagramSelectionTypes'

export type { DiagramCanvasSettings }

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
  /** 移入回收站前所在分组（仅回收站条目有值） */
  previousFolderId?: string | null
  title: string
  pageCount: number
  thumbnailPath: string | null
  pinned: boolean
  sizeBytes: number | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface DiagramSearchHit {
  meta: DiagramFileMeta
  matchedInTitle: boolean
  matchedInContent: boolean
  /** 主进程生成的正文摘要，避免渲染进程二次 readFile */
  contentPreview?: string
}

export interface DiagramPage {
  id: string
  name: string
  sortOrder: number
  viewport: { x: number; y: number; zoom: number }
  graphData: DiagramGraphData
  /** 画布显示与主题偏好（可选，旧文件无此字段） */
  canvasSettings?: DiagramCanvasSettings
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
  /** 1=单文件 content.json；2=文档包（meta + pages 分文件） */
  formatVersion: 1 | 2
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

/** 文档包增量写入：仅落盘变更页与元数据 */
export interface DiagramWritePatch {
  dirtyPageIds: string[]
  metaDirty?: boolean
  deletedPageIds?: string[]
}

export type DiagramExportWfgResult =
  | { ok: true; path: string }
  | { ok: false; canceled?: boolean; error?: string }

export type DiagramSaveNewResult =
  | { ok: true; record: DiagramFileRecord; path: string }
  | { ok: false; canceled?: boolean; error?: string }

export type DiagramImportWfgResult =
  | { ok: true; content: DiagramContent; sourcePath: string }
  | { ok: false; canceled?: boolean; error?: string }

export type DiagramImportNodeAssetResult =
  | { ok: true; assetId: string; ext: string; url: string }
  | { ok: false; canceled?: boolean; error?: string }

export type DiagramImportDrawioResult =
  | { ok: true; content: DiagramContent; sourcePath: string }
  | { ok: false; canceled?: boolean; error?: string }

export interface DiagramTemplate {
  id: string
  name: string
  description: string
  content: DiagramContent
}
