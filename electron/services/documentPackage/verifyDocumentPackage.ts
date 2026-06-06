/**
 * 文档包自测：创建 → 增量写入 → 校验 → 导出 zip → 再打开校验
 * 运行：npx tsx electron/services/documentPackage/verifyDocumentPackage.ts
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { WFG_PATHS } from '@shared/documentPackage'
import { WanwuDocumentPackage } from './WanwuDocumentPackage'
import { openPackageFromFolder, saveAllEntriesToFolder, saveDirtyEntriesToFolder } from './fsStore'
import { openPackageFromZip, savePackageToZip } from './zipStore'
import { createEncryptionMeta, encryptEntry, decryptEntry } from './crypto'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

async function run(): Promise<void> {
  const workDir = mkdtempSync(join(tmpdir(), 'wanwu-pkg-verify-'))
  const zipPath = join(workDir, 'test.wfg')

  try {
    const pkg = WanwuDocumentPackage.create({
      docType: 'flow-graph',
      docId: 'doc-test-1',
      title: '测试流程图'
    })
    pkg.setEntryJson(WFG_PATHS.meta, {
      format: 'wanwu-diagram',
      formatVersion: 2,
      engine: 'logicflow',
      engineVersion: '2.2.x',
      title: '测试流程图',
      defaultPageId: 'page-1'
    })
    pkg.setEntryJson(WFG_PATHS.page('page-1'), {
      id: 'page-1',
      name: '页1',
      sortOrder: 0,
      viewport: { x: 0, y: 0, zoom: 1 },
      graphData: { nodes: [], edges: [] }
    })

    let verify = pkg.verify()
    assert(verify.ok, `初始校验失败: ${JSON.stringify(verify.issues)}`)

    const folder = join(workDir, 'bundle')
    saveAllEntriesToFolder(folder, pkg)
    assert(!pkg.isDirty(), '全量保存后应无脏条目')

    pkg.setEntryJson(WFG_PATHS.page('page-1'), {
      id: 'page-1',
      name: '页1-改',
      sortOrder: 0,
      viewport: { x: 10, y: 0, zoom: 1 },
      graphData: { nodes: [{ id: 'n1' }], edges: [] }
    })
    assert(pkg.isDirty(), '修改后应有脏标记')
    assert(pkg.getDirtyPaths().includes(WFG_PATHS.page('page-1')), '应仅页文件为脏')

    saveDirtyEntriesToFolder(folder, pkg)
    assert(!pkg.isDirty(), '增量保存后应无脏条目')

    const reopenedFolder = openPackageFromFolder(folder)
    verify = reopenedFolder.verify()
    assert(verify.ok, `目录重开校验失败: ${JSON.stringify(verify.issues)}`)

    const pageOnDisk = JSON.parse(
      readFileSync(join(folder, WFG_PATHS.page('page-1')), 'utf-8')
    ) as { name: string }
    assert(pageOnDisk.name === '页1-改', '磁盘页内容未更新')

    await savePackageToZip(zipPath, pkg)
    const reopened = await openPackageFromZip(zipPath)
    verify = reopened.verify()
    assert(verify.ok, `zip 重开校验失败: ${JSON.stringify(verify.issues)}`)
    const pageText = reopened.getEntryText(WFG_PATHS.page('page-1'))
    assert(Boolean(pageText?.includes('页1-改')), 'zip 内页内容不正确')

    const encMeta = createEncryptionMeta('test-password')
    const plain = Buffer.from('secret asset', 'utf-8')
    const encrypted = encryptEntry(plain, 'test-password', encMeta)
    const decrypted = decryptEntry(encrypted, 'test-password', encMeta)
    assert(decrypted.toString('utf-8') === 'secret asset', '加解密往返失败')

    console.log('[verifyDocumentPackage] 全部通过')
  } finally {
    rmSync(workDir, { recursive: true, force: true })
  }
}

run().catch((err) => {
  console.error('[verifyDocumentPackage] 失败:', err)
  process.exit(1)
})
