import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'fs'
import { join } from 'path'
import {
  extractInlineImageAssets,
  materializeGraphInlineAssets
} from '../../../src/modules/library/diagrams/lib/diagramInlineAssets'
import type { DiagramContent, DiagramWritePatch } from '../../../src/shared/types/diagrams'
import {
  isPackageLayoutDir,
  WfgDiagramDocument,
  diagramContentFromLegacy
} from './wfgDiagramDocument'

export function diagramContentDir(mediaDir: string, fileId: string): string {
  return join(mediaDir, 'diagrams', fileId)
}

/** 旧版单文件路径（只读兼容） */
export function diagramContentPath(mediaDir: string, fileId: string): string {
  return join(diagramContentDir(mediaDir, fileId), 'content.json')
}

export function relativeContentPath(fileId: string): string {
  return `diagrams/${fileId}/manifest.json`
}

function readLegacyContent(mediaDir: string, fileId: string): DiagramContent | null {
  const path = diagramContentPath(mediaDir, fileId)
  if (!existsSync(path)) return null
  const raw = readFileSync(path, 'utf8')
  return JSON.parse(raw) as DiagramContent
}

export function readDiagramContent(mediaDir: string, fileId: string): DiagramContent | null {
  const dir = diagramContentDir(mediaDir, fileId)
  if (isPackageLayoutDir(dir)) {
    return WfgDiagramDocument.openFolder(fileId, dir).readContent()
  }
  const legacy = readLegacyContent(mediaDir, fileId)
  return legacy ? diagramContentFromLegacy(legacy) : null
}

export function writeDiagramContentPatch(
  mediaDir: string,
  fileId: string,
  content: DiagramContent,
  patch: DiagramWritePatch
): void {
  const dir = diagramContentDir(mediaDir, fileId)
  if (!isPackageLayoutDir(dir)) {
    writeDiagramContent(mediaDir, fileId, content)
    return
  }

  const doc = WfgDiagramDocument.openFolder(fileId, dir)
  const normalized = diagramContentFromLegacy(content)

  if (patch.metaDirty) {
    doc.writeMeta({
      format: 'wanwu-diagram',
      formatVersion: 2,
      engine: normalized.engine,
      engineVersion: normalized.engineVersion,
      title: normalized.meta.title,
      defaultPageId: normalized.meta.defaultPageId
    })
  }

  for (const pageId of patch.deletedPageIds ?? []) {
    doc.deletePageEntry(pageId)
  }

  for (const pageId of patch.dirtyPageIds) {
    const page = normalized.pages.find((p) => p.id === pageId)
    if (!page) continue
    const { graph, assets } = materializeGraphInlineAssets(page.graphData)
    for (const asset of assets) {
      doc.writeAsset(asset.assetId, asset.ext, Buffer.from(asset.bytes))
    }
    doc.writePage({ ...page, graphData: graph })
  }

  doc.flushDirtyToFolder(dir)
}

export function writeDiagramContent(
  mediaDir: string,
  fileId: string,
  content: DiagramContent
): void {
  writeDiagramContentWithAssets(mediaDir, fileId, content)
}

/** 写入文档包，并将图中 data URL 内嵌图落盘到 assets/ */
export function writeDiagramContentWithAssets(
  mediaDir: string,
  fileId: string,
  content: DiagramContent
): DiagramContent {
  const { content: stripped, assets } = extractInlineImageAssets(content)
  const dir = diagramContentDir(mediaDir, fileId)
  mkdirSync(dir, { recursive: true })

  const legacyPath = diagramContentPath(mediaDir, fileId)
  if (existsSync(legacyPath) && !isPackageLayoutDir(dir)) {
    rmSync(legacyPath, { force: true })
  }

  const normalized = diagramContentFromLegacy(stripped)
  const doc = isPackageLayoutDir(dir)
    ? WfgDiagramDocument.openFolder(fileId, dir)
    : WfgDiagramDocument.create(fileId, normalized.meta.title, normalized)

  if (isPackageLayoutDir(dir)) {
    doc.replaceContent(normalized)
  }

  for (const asset of assets) {
    doc.writeAsset(asset.assetId, asset.ext, Buffer.from(asset.bytes))
  }

  if (isPackageLayoutDir(dir)) {
    doc.flushDirtyToFolder(dir)
  } else {
    doc.saveFolder(dir)
  }

  return doc.readContent()
}

export function deleteDiagramContent(mediaDir: string, fileId: string): void {
  const dir = diagramContentDir(mediaDir, fileId)
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true })
}

function dirSizeBytes(dir: string): number {
  let total = 0
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) total += dirSizeBytes(full)
    else total += st.size
  }
  return total
}

export function diagramContentSizeBytes(mediaDir: string, fileId: string): number | null {
  const dir = diagramContentDir(mediaDir, fileId)
  if (!existsSync(dir)) return null
  if (isPackageLayoutDir(dir)) {
    try {
      return dirSizeBytes(dir)
    } catch {
      return null
    }
  }
  const path = diagramContentPath(mediaDir, fileId)
  if (!existsSync(path)) return null
  try {
    return statSync(path).size
  } catch {
    return null
  }
}

export function createBlankContent(title = '未命名流程图'): DiagramContent {
  return {
    format: 'wanwu-diagram',
    formatVersion: 2,
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

export async function readDrawioFile(drawioPath: string): Promise<DiagramContent> {
  const { readFile } = await import('fs/promises')
  const { basename, extname } = await import('path')
  const { decodeDrawioFileContent } = await import('./drawioDecode')
  const { embedDrawioExternalImages } = await import('./drawioImages')
  const { drawioXmlToDiagramContent } = await import(
    '../../../src/modules/library/diagrams/lib/drawioToDiagram'
  )
  const raw = await readFile(drawioPath, 'utf8')
  const decoded = decodeDrawioFileContent(raw)
  const title = basename(drawioPath, extname(drawioPath))
  const parsed = drawioXmlToDiagramContent(decoded, title)
  return embedDrawioExternalImages(parsed, drawioPath)
}

export async function readWfgFile(wfgPath: string): Promise<DiagramContent> {
  const doc = await WfgDiagramDocument.openWfg('import', wfgPath)
  return doc.readContent()
}

/** 从 .wfg 导入并落盘到新 fileId（含 assets/ 内嵌资源） */
export async function materializeImportedWfg(
  mediaDir: string,
  wfgPath: string,
  newFileId: string,
  content: DiagramContent
): Promise<void> {
  const src = await WfgDiagramDocument.openWfg('import', wfgPath)
  const dir = diagramContentDir(mediaDir, newFileId)
  mkdirSync(dir, { recursive: true })
  const dest = WfgDiagramDocument.create(newFileId, content.meta.title, diagramContentFromLegacy(content))

  for (const path of src.getPackage().listEntryPaths()) {
    if (!path.startsWith('assets/')) continue
    const data = src.getPackage().getEntryBuffer(path)
    if (!data) continue
    const name = path.slice('assets/'.length)
    const dot = name.lastIndexOf('.')
    const assetId = dot >= 0 ? name.slice(0, dot) : name
    const ext = dot >= 0 ? name.slice(dot + 1) : 'png'
    dest.writeAsset(assetId, ext, data)
  }

  dest.replaceContent(diagramContentFromLegacy(content))
  dest.saveFolder(dir)
}

export async function exportContentWfg(content: DiagramContent, wfgPath: string): Promise<void> {
  const { content: stripped, assets } = extractInlineImageAssets(content)
  const doc = WfgDiagramDocument.create('export', stripped.meta.title, diagramContentFromLegacy(stripped))
  for (const asset of assets) {
    doc.writeAsset(asset.assetId, asset.ext, Buffer.from(asset.bytes))
  }
  await doc.exportWfg(wfgPath)
}

export function writeDiagramAsset(
  mediaDir: string,
  fileId: string,
  assetId: string,
  ext: string,
  data: Buffer
): void {
  const dir = diagramContentDir(mediaDir, fileId)
  if (!isPackageLayoutDir(dir)) {
    const legacy = readLegacyContent(mediaDir, fileId)
    if (legacy) {
      writeDiagramContent(mediaDir, fileId, legacy)
    } else {
      mkdirSync(dir, { recursive: true })
      WfgDiagramDocument.create(fileId, '未命名流程图').saveFolder(dir)
    }
  }

  const doc = WfgDiagramDocument.openFolder(fileId, dir)
  doc.writeAsset(assetId, ext, data)
  doc.flushDirtyToFolder(dir)
}

/** 将未保存文档的临时资源写入包内 assets（新建后首次插图） */
export function ensureDiagramPackageDir(mediaDir: string, fileId: string, title: string): void {
  const dir = diagramContentDir(mediaDir, fileId)
  if (isPackageLayoutDir(dir)) return
  mkdirSync(dir, { recursive: true })
  WfgDiagramDocument.create(fileId, title).saveFolder(dir)
}

export async function exportDiagramWfg(
  mediaDir: string,
  fileId: string,
  wfgPath: string
): Promise<void> {
  const dir = diagramContentDir(mediaDir, fileId)
  const doc = isPackageLayoutDir(dir)
    ? WfgDiagramDocument.openFolder(fileId, dir)
    : WfgDiagramDocument.create(
        fileId,
        '未命名流程图',
        readLegacyContent(mediaDir, fileId) ?? createBlankContent()
      )
  await doc.exportWfg(wfgPath)
}
