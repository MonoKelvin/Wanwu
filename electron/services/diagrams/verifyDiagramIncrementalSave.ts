/**
 * 流程图增量保存自测
 * 运行：npx tsx --tsconfig tsconfig.node.json electron/services/diagrams/verifyDiagramIncrementalSave.ts
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { WFG_PATHS } from '@shared/documentPackage'
import {
  exportContentWfg,
  readDiagramContent,
  readWfgFile,
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
        },
        {
          id: 'page-2',
          name: '页2',
          sortOrder: 1,
          viewport: { x: 0, y: 0, zoom: 1 },
          graphData: { nodes: [], edges: [] }
        }
      ]
    }

    writeDiagramContent(mediaDir, fileId, initial)
    const dir = join(mediaDir, 'diagrams', fileId)
    const page1Path = join(dir, WFG_PATHS.page('page-1'))
    const page2Path = join(dir, WFG_PATHS.page('page-2'))
    const page2Before = readFileSync(page2Path, 'utf-8')

    const updated = structuredClone(initial)
    updated.pages[0] = {
      ...updated.pages[0],
      graphData: { nodes: [{ id: 'n1', type: 'rect' }], edges: [] }
    }

    writeDiagramContentPatch(mediaDir, fileId, updated, {
      dirtyPageIds: ['page-1'],
      metaDirty: false
    })

    const page1After = readFileSync(page1Path, 'utf-8')
    const page2After = readFileSync(page2Path, 'utf-8')
    assert(page1After.includes('n1'), 'page-1 应写入新节点')
    assert(page2After === page2Before, 'page-2 内容应保持不变')

    const reloaded = readDiagramContent(mediaDir, fileId)
    assert(reloaded?.pages[0].graphData.nodes.length === 1, '重读应包含节点')

    updated.meta.title = '新标题'
    writeDiagramContentPatch(mediaDir, fileId, updated, {
      dirtyPageIds: [],
      metaDirty: true
    })
    const meta = JSON.parse(readFileSync(join(dir, WFG_PATHS.meta), 'utf-8')) as { title: string }
    assert(meta.title === '新标题', 'meta.json 标题应更新')

    const wfgDir = mkdtempSync(join(tmpdir(), 'wanwu-dg-wfg-'))
    const wfgPath = join(wfgDir, 'roundtrip.wfg')
    try {
      await exportContentWfg(updated, wfgPath)
      const imported = await readWfgFile(wfgPath)
      assert(imported.meta.title === '新标题', 'wfg 往返标题应一致')
      assert(imported.pages[0].graphData.nodes.length === 1, 'wfg 往返节点应保留')
    } finally {
      rmSync(wfgDir, { recursive: true, force: true })
    }

    console.log('[verifyDiagramIncrementalSave] 全部通过')
  } finally {
    rmSync(mediaDir, { recursive: true, force: true })
  }
}

run().catch((err) => {
  console.error('[verifyDiagramIncrementalSave] 失败:', err)
  process.exit(1)
})
