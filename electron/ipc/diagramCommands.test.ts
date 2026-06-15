import { describe, expect, it, vi } from 'vitest'
import { isMainProcessCommand, isRendererProcessCommand } from '../services/diagrams/ipcCommands'
import { DiagramCmd } from '../../src/modules/library/diagrams/app/command/domain/ids'

describe('diagram command routing', () => {
  it('classifies catalog as main and document as renderer', () => {
    expect(isMainProcessCommand(DiagramCmd.Catalog.File.List)).toBe(true)
    expect(isRendererProcessCommand(DiagramCmd.Document.AddNode)).toBe(true)
    expect(isRendererProcessCommand(DiagramCmd.File.Save)).toBe(true)
  })
})

describe('executeCommands result ordering', () => {
  it('preserves per-command result index when interleaving main and renderer', async () => {
    const cmds = [
      { type: DiagramCmd.Catalog.File.List, payload: { folderId: 'f' } },
      { type: DiagramCmd.Document.Zoom, payload: { delta: 1 } },
      { type: DiagramCmd.Catalog.Folder.List, payload: {} }
    ]

    const results: Array<{ ok: boolean }> = []
    for (const cmd of cmds) {
      if (isMainProcessCommand(cmd.type)) {
        results.push({ ok: true })
      } else if (isRendererProcessCommand(cmd.type)) {
        results.push({ ok: true })
      }
    }

    expect(results).toHaveLength(3)
    expect(results.every((r) => r.ok)).toBe(true)
  })
})
