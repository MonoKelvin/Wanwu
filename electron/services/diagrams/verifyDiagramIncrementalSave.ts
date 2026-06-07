/**
 * 流程图增量保存自测
 * 运行：npx tsx --tsconfig tsconfig.node.json electron/services/diagrams/verifyDiagramIncrementalSave.ts
 */
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { WFG_PATHS } from '@shared/documentPackage'
import {
  exportContentWfg,
  findDiagramWfgPath,
  readDiagramContent,
  readWfgFile,
  relativeContentPath,
  writeDiagramContent,
  writeDiagramContentPatch
} from './diagramFileStorage'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

async function run(): Promise<void> {
  const mediaDir = mkdtempSync(join(tmpdir(), 'wanwu-dg-save-'))
  const fileId = 'file-test-1'

  try {
    const initial = {
      format: 'wanwu-diagram' as const,
      formatVersion: 2 as const,
      engine: 'logicflow' as const,
      engineVersion: '2.2.x',
      meta: { title: '测试图', defaultPageId: 'page-1' },
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

    const contentPath = relativeContentPath(fileId, initial.meta.title)
    await writeDiagramContent(mediaDir, fileId, contentPath, initial)
    const wfgPath = findDiagramWfgPath(mediaDir, fileId)
    assert(Boolean(wfgPath), '应落盘为 .wfg 文件')
    assert(wfgPath!.endsWith('.wfg'), '物理文件应为 .wfg')

    const updated = structuredClone(initial)
    updated.meta.title = '新标题'
    updated.pages[0].graphData.nodes = [{ id: 'n1', type: 'rect', x: 0, y: 0 }]

    await writeDiagramContentPatch(mediaDir, fileId, contentPath, updated, {
      dirtyPageIds: ['page-1'],
      metaDirty: true
    })

    const reloaded = await readDiagramContent(mediaDir, fileId, contentPath, updated.meta.title)
    assert(reloaded?.meta.title === '新标题', '增量保存后标题应更新')
    assert(reloaded?.pages[0].graphData.nodes.length === 1, '增量保存后节点应保留')

    await writeDiagramContentPatch(mediaDir, fileId, contentPath, updated, {
      dirtyPageIds: [],
      metaDirty: false
    })

    const wfgDir = mkdtempSync(join(tmpdir(), 'wanwu-dg-wfg-'))
    const roundtripPath = join(wfgDir, 'roundtrip.wfg')
    try {
      await exportContentWfg(updated, roundtripPath)
      const imported = await readWfgFile(roundtripPath)
      assert(imported.meta.title === '新标题', 'wfg 往返标题应一致')
      assert(imported.pages[0].graphData.nodes.length === 1, 'wfg 往返节点应保留')
    } finally {
      rmSync(wfgDir, { recursive: true, force: true })
    }

    const finalWfg = findDiagramWfgPath(mediaDir, fileId)
    assert(Boolean(finalWfg), '重命名后仍应有 .wfg 文件')
    const wfgSize = statSync(finalWfg!).size
    assert(wfgSize > 0, '.wfg 文件大小应大于 0')

    console.log('[verifyDiagramIncrementalSave] OK')
  } finally {
    rmSync(mediaDir, { recursive: true, force: true })
  }
}

void run().catch((err) => {
  console.error('[verifyDiagramIncrementalSave] FAILED', err)
  process.exit(1)
})
