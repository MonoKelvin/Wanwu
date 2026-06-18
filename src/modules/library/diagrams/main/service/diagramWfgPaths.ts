import { existsSync, readdirSync } from 'node:fs'
import { isAbsolute, join, normalize } from 'node:path'
import { tmpdir } from 'node:os'
import { DIAGRAM_WFG_FILE_EXTENSION } from '@modules/library/diagrams/domain/diagramPackagePaths'
import { diagramTitleBase } from '@modules/library/diagrams/lib/diagramHomeUtils'

export function sanitizeDiagramWfgBaseName(title: string): string {
  const base = diagramTitleBase(title)
  const sanitized = base
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
  return sanitized || '未命名流程图'
}

export function diagramWfgFileName(title: string): string {
  return `${sanitizeDiagramWfgBaseName(title)}${DIAGRAM_WFG_FILE_EXTENSION}`
}

export function diagramContentDir(mediaDir: string, fileId: string): string {
  return join(mediaDir, 'diagrams', fileId)
}

export function diagramWfgPath(mediaDir: string, fileId: string, title: string): string {
  return join(diagramContentDir(mediaDir, fileId), diagramWfgFileName(title))
}

export function findDiagramWfgPath(mediaDir: string, fileId: string): string | null {
  const dir = diagramContentDir(mediaDir, fileId)
  if (!existsSync(dir)) return null
  for (const name of readdirSync(dir)) {
    if (name.toLowerCase().endsWith(DIAGRAM_WFG_FILE_EXTENSION)) {
      return join(dir, name)
    }
  }
  return null
}

export function diagramWorkDir(fileId: string): string {
  return join(tmpdir(), 'wanwu-diagram-work', fileId)
}

export function relativeDiagramWfgPath(fileId: string, title: string): string {
  return `diagrams/${fileId}/${diagramWfgFileName(title)}`
}

/** 用户通过保存对话框选择的绝对路径 */
export function isExternalDiagramContentPath(contentPath: string): boolean {
  return isAbsolute(contentPath.trim())
}

/** 将 DB content_path 解析为磁盘上的 .wfg 绝对路径 */
export function resolveStoredDiagramWfgPath(mediaDir: string, contentPath: string): string {
  const trimmed = contentPath.trim()
  if (isAbsolute(trimmed)) return normalize(trimmed)
  return normalize(join(mediaDir, trimmed))
}
