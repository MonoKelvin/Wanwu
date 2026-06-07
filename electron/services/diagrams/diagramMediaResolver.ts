import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { WanwuPathLayout } from '../data/paths'
import { findDiagramWfgPath } from './diagramWfgPaths'
import { getRegisteredDiagramWfgPath, resolveDiagramAssetCachePath } from './diagramWfgStore'

const DIAGRAM_ASSET_RE = /^diagrams\/([^/]+)\/assets\/([^/.]+)\.([a-z0-9]+)$/i
const DIAGRAM_WFG_RE = /^diagrams\/([^/]+)\/.+\.wfg$/i

function tryPath(...candidates: string[]): string | null {
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return null
}

/** 解析流程图 wanwu-media 路径（.wfg 本体或包内 assets） */
export async function resolveDiagramMediaAbsolute(
  rel: string,
  layout: WanwuPathLayout
): Promise<string | null> {
  const assetMatch = DIAGRAM_ASSET_RE.exec(rel)
  if (assetMatch) {
    const [, fileId, assetId, ext] = assetMatch
    const loose = tryPath(join(layout.media, rel), join(layout.root, rel))
    if (loose) return loose
    return resolveDiagramAssetCachePath(layout.media, fileId, assetId, ext)
  }

  const wfgMatch = DIAGRAM_WFG_RE.exec(rel)
  if (wfgMatch) {
    const [, fileId] = wfgMatch
    const registered = getRegisteredDiagramWfgPath(fileId)
    if (registered) return registered
    const wfg = findDiagramWfgPath(layout.media, fileId)
    if (wfg) return wfg
    return tryPath(join(layout.media, rel), join(layout.root, rel))
  }

  return null
}
