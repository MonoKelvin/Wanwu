import assert from 'node:assert/strict'
import { validateDiagramCommand } from '../electron/services/diagrams/commandValidation.ts'

function expectFail(cmd, code) {
  const result = validateDiagramCommand(cmd)
  assert.ok(result, `expected failure for ${cmd.type}`)
  assert.equal(result.ok, false)
  assert.equal(result.code, code)
}

function expectOk(cmd) {
  const result = validateDiagramCommand(cmd)
  assert.equal(result, null)
}

expectFail({ type: 'file.create', payload: { folderId: 'dg-home', title: 'x' } }, 'VALIDATION')
expectFail({ type: 'folder.delete', payload: { folderId: 'dg-recycle' } }, 'VALIDATION')
expectFail({ type: 'unknown.cmd', payload: {} }, 'UNKNOWN_COMMAND')

expectOk({ type: 'file.create', payload: { folderId: 'dg-files', title: '测试' } })
expectOk({ type: 'folder.list', payload: {} })
expectOk({ type: 'file.list', payload: { folderId: 'dg-drafts' } })

console.log('diagram command validation: ok')
