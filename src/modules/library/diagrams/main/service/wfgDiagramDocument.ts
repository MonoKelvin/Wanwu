import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { MANIFEST_ENTRY_PATH } from '@shared/documentPackage'
import type { IWanwuDocumentPackage } from '@shared/documentPackage'
import {
  WanwuDocumentPackage,
  openPackageFromFolder,
  openPackageFromZip,
  saveAllEntriesToFolder,
  saveDirtyEntriesToFolder,
  savePackageToZip
} from '@shared/documentPackage/node'
import { DIAGRAM_PACKAGE_PATHS } from '@modules/library/diagrams/domain/diagramPackagePaths'
import type { DiagramContent, DiagramPage } from '@modules/library/diagrams/domain/types'

export interface WfgDiagramMetaFile {
  format: 'wanwu-diagram'
  formatVersion: 2
  engine: DiagramContent['engine']
  engineVersion: string
  title: string
  defaultPageId: string
}

function toMetaFile(content: DiagramContent): WfgDiagramMetaFile {
  return {
    format: 'wanwu-diagram',
    formatVersion: 2,
    engine: content.engine,
    engineVersion: content.engineVersion,
    title: content.meta.title,
    defaultPageId: content.meta.defaultPageId
  }
}

function toDiagramContent(meta: WfgDiagramMetaFile, pages: DiagramPage[]): DiagramContent {
  return {
    format: 'wanwu-diagram',
    formatVersion: 2,
    engine: meta.engine,
    engineVersion: meta.engineVersion,
    meta: { title: meta.title, defaultPageId: meta.defaultPageId },
    pages: pages.sort((a, b) => a.sortOrder - b.sortOrder)
  }
}

export function isPackageLayoutDir(dir: string): boolean {
  return existsSync(join(dir, MANIFEST_ENTRY_PATH))
}

export class WfgDiagramDocument {
  private constructor(
    readonly fileId: string,
    private readonly pkg: IWanwuDocumentPackage
  ) {}

  static openFolder(fileId: string, dir: string): WfgDiagramDocument {
    const pkg = openPackageFromFolder(dir)
    return new WfgDiagramDocument(fileId, pkg)
  }

  static create(fileId: string, title: string, content?: DiagramContent): WfgDiagramDocument {
    const pkg = WanwuDocumentPackage.create({
      docType: 'flow-graph',
      docId: fileId,
      title: content?.meta.title ?? title
    })
    const doc = new WfgDiagramDocument(fileId, pkg)
    if (content) {
      doc.replaceContent(content)
    } else {
      doc.replaceContent({
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
      })
    }
    return doc
  }

  static async openWfg(fileId: string, wfgPath: string): Promise<WfgDiagramDocument> {
    const pkg = await openPackageFromZip(wfgPath)
    return new WfgDiagramDocument(fileId, pkg)
  }

  readContent(): DiagramContent {
    const metaText = this.pkg.getEntryText(DIAGRAM_PACKAGE_PATHS.meta)
    if (!metaText) {
      throw new Error('流程图包缺少 content/meta.json')
    }
    const meta = JSON.parse(metaText) as WfgDiagramMetaFile
    const pages: DiagramPage[] = []
    for (const path of this.pkg.listEntryPaths()) {
      if (!path.startsWith('content/pages/') || !path.endsWith('.json')) continue
      const text = this.pkg.getEntryText(path)
      if (text) pages.push(JSON.parse(text) as DiagramPage)
    }
    return toDiagramContent(meta, pages)
  }

  replaceContent(content: DiagramContent): void {
    this.pkg.setEntryJson(DIAGRAM_PACKAGE_PATHS.meta, toMetaFile(content))
    const existing = new Set(
      this.pkg
        .listEntryPaths()
        .filter((p) => p.startsWith('content/pages/') && p.endsWith('.json'))
    )
    for (const page of content.pages) {
      const path = DIAGRAM_PACKAGE_PATHS.page(page.id)
      existing.delete(path)
      this.pkg.setEntryJson(path, page)
    }
    for (const orphan of existing) {
      this.pkg.deleteEntry(orphan)
    }
    this.pkg.updateTitle(content.meta.title)
  }

  writePage(page: DiagramPage): void {
    this.pkg.setEntryJson(DIAGRAM_PACKAGE_PATHS.page(page.id), page)
  }

  deletePageEntry(pageId: string): void {
    this.pkg.deleteEntry(DIAGRAM_PACKAGE_PATHS.page(pageId))
  }

  writeMeta(partial: Partial<WfgDiagramMetaFile>): void {
    const metaText = this.pkg.getEntryText(DIAGRAM_PACKAGE_PATHS.meta)
    const base: WfgDiagramMetaFile = metaText
      ? (JSON.parse(metaText) as WfgDiagramMetaFile)
      : {
          format: 'wanwu-diagram',
          formatVersion: 2,
          engine: 'logicflow',
          engineVersion: '2.2.x',
          title: this.pkg.getManifest().title,
          defaultPageId: 'page-1'
        }
    this.pkg.setEntryJson(DIAGRAM_PACKAGE_PATHS.meta, { ...base, ...partial })
    if (partial.title) this.pkg.updateTitle(partial.title)
  }

  writeAsset(assetId: string, ext: string, data: Buffer): void {
    this.pkg.setEntryBuffer(DIAGRAM_PACKAGE_PATHS.asset(assetId, ext), data, {
      mediaType: `image/${ext === 'jpg' ? 'jpeg' : ext}`
    })
  }

  verify() {
    return this.pkg.verify()
  }

  flushDirtyToFolder(dir: string): void {
    saveDirtyEntriesToFolder(dir, this.pkg)
  }

  saveFolder(dir: string): void {
    saveAllEntriesToFolder(dir, this.pkg)
  }

  async exportWfg(wfgPath: string): Promise<void> {
    await savePackageToZip(wfgPath, this.pkg)
  }

  getPackage(): IWanwuDocumentPackage {
    return this.pkg
  }
}

export function diagramContentFromLegacy(content: DiagramContent): DiagramContent {
  return {
    ...content,
    formatVersion: 2
  }
}
