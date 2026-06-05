import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { DiagramContent } from '../../../src/shared/types/diagrams'

export function diagramContentDir(mediaDir: string, fileId: string): string {
  return join(mediaDir, 'diagrams', fileId)
}

export function diagramContentPath(mediaDir: string, fileId: string): string {
  return join(diagramContentDir(mediaDir, fileId), 'content.json')
}

export function relativeContentPath(fileId: string): string {
  return `diagrams/${fileId}/content.json`
}

export function readDiagramContent(mediaDir: string, fileId: string): DiagramContent | null {
  const path = diagramContentPath(mediaDir, fileId)
  if (!existsSync(path)) return null
  const raw = readFileSync(path, 'utf8')
  return JSON.parse(raw) as DiagramContent
}

export function writeDiagramContent(
  mediaDir: string,
  fileId: string,
  content: DiagramContent
): void {
  const dir = diagramContentDir(mediaDir, fileId)
  mkdirSync(dir, { recursive: true })
  writeFileSync(diagramContentPath(mediaDir, fileId), JSON.stringify(content, null, 2), 'utf8')
}

export function deleteDiagramContent(mediaDir: string, fileId: string): void {
  const dir = diagramContentDir(mediaDir, fileId)
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true })
}

export function createBlankContent(title = '未命名流程图'): DiagramContent {
  return {
    format: 'wanwu-diagram',
    formatVersion: 1,
    engine: 'logicflow',
    engineVersion: '2.2.x',
    meta: { title, defaultPageId: 'page-1' },
    pages: [
      {
        id: 'page-1',
        name: '页1',
        sortOrder: 0,
        viewport: { x: 0, y: 0, zoom: 1 },
        graphData: { nodes: [], edges: [] }
      }
    ]
  }
}
