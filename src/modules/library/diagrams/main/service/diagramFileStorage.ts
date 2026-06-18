import { existsSync, rmSync } from 'node:fs'
import { join } from 'path'
import {
  createTempWfgPath,
  publishTempWfgFile
} from './diagramWfgFs'
import {
  extractInlineImageAssets
} from '@modules/library/diagrams/lib/diagramInlineAssets'
import type { DiagramContent } from '@modules/library/diagrams/domain/types'
import {
  diagramContentDir,
  findDiagramWfgPath,
  relativeDiagramWfgPath
} from './diagramWfgPaths'
import {
  WfgDiagramDocument,
  diagramContentFromLegacy
} from './wfgDiagramDocument'
import {
  copyDiagramPackageAssets,
  deleteDiagramContent,
  diagramContentSizeBytes,
  ensureDiagramWfgFile,
  migrateAllDiagramStorageToWfg,
  readDiagramContent,
  renameDiagramWfgFile,
  writeDiagramAsset,
  writeDiagramContent,
  writeDiagramContentPatch,
  writeDiagramContentWithAssets,
  registerDiagramWfgPath
} from './diagramWfgStore'

export {
  diagramContentDir,
  diagramWfgPath,
  findDiagramWfgPath,
  relativeDiagramWfgPath
} from './diagramWfgPaths'

export {
  copyDiagramPackageAssets,
  deleteDiagramContent,
  diagramContentSizeBytes,
  ensureDiagramWfgFile,
  migrateAllDiagramStorageToWfg,
  readDiagramContent,
  renameDiagramWfgFile,
  writeDiagramAsset,
  writeDiagramContent,
  writeDiagramContentPatch,
  writeDiagramContentWithAssets,
  registerDiagramWfgPath
}

export function relativeContentPath(fileId: string, title = '未命名流程图'): string {
  return relativeDiagramWfgPath(fileId, title)
}

/** @deprecated 仅兼容旧引用 */
export function diagramContentPath(mediaDir: string, fileId: string): string {
  const wfg = findDiagramWfgPath(mediaDir, fileId)
  if (wfg) return wfg
  return join(diagramContentDir(mediaDir, fileId), 'content.json')
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
    '@modules/library/diagrams/lib/drawioToDiagram'
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

export async function materializeImportedWfg(
  mediaDir: string,
  wfgPath: string,
  newFileId: string,
  content: DiagramContent
): Promise<void> {
  const src = await WfgDiagramDocument.openWfg('import', wfgPath)
  const dest = WfgDiagramDocument.create(
    newFileId,
    content.meta.title,
    diagramContentFromLegacy(content)
  )

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
  await writeDiagramContentWithAssets(
    mediaDir,
    newFileId,
    relativeDiagramWfgPath(newFileId, content.meta.title),
    dest.readContent()
  )
}

export async function exportContentWfg(content: DiagramContent, wfgPath: string): Promise<void> {
  const tempPath = createTempWfgPath()
  try {
    const { content: stripped, assets } = extractInlineImageAssets(content)
    const doc = WfgDiagramDocument.create(
      'export',
      stripped.meta.title,
      diagramContentFromLegacy(stripped)
    )
    for (const asset of assets) {
      doc.writeAsset(asset.assetId, asset.ext, Buffer.from(asset.bytes))
    }
    await doc.exportWfg(tempPath)
    await publishTempWfgFile(tempPath, wfgPath)
  } finally {
    if (existsSync(tempPath)) rmSync(tempPath, { force: true })
  }
}

export async function ensureDiagramPackageDir(
  mediaDir: string,
  fileId: string,
  contentPath: string,
  title: string
): Promise<void> {
  await ensureDiagramWfgFile(mediaDir, fileId, contentPath, title)
}

export async function exportDiagramWfg(
  mediaDir: string,
  fileId: string,
  contentPath: string,
  wfgPath: string
): Promise<void> {
  const content = await readDiagramContent(mediaDir, fileId, contentPath)
  if (!content) {
    await exportContentWfg(createBlankContent(), wfgPath)
    return
  }
  await exportContentWfg(content, wfgPath)
}
