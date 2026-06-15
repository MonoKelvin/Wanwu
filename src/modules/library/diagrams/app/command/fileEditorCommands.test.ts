import { describe, expect, it, vi } from 'vitest'
import { registerFileEditorCommands } from '@modules/library/diagrams/app/command/fileEditorCommands'
import { DiagramCommandRegistry } from '@modules/library/diagrams/app/command/DiagramCommandRegistry'
import { DiagramCmd } from '@modules/library/diagrams/app/command/domain/ids'
import type { DiagramCommandExecutionContext } from '@modules/library/diagrams/app/command/DiagramAppCommand'
import type { DiagramEditorSession } from '@modules/library/diagrams/app/DiagramEditorSession'

describe('FileReload command', () => {
  it('reloads with force when file is already open', async () => {
    const registry = new DiagramCommandRegistry()
    registerFileEditorCommands(registry)

    const openFromFile = vi.fn().mockResolvedValue(undefined)
    const session = {
      fileId: 'f1',
      openFromFile
    } as unknown as DiagramEditorSession

    const ctx = {
      command: { sessionId: 's1', fileId: 'f1', activePageId: 'p1' },
      session,
      port: null,
      tx: null,
      repo: {} as never
    } satisfies DiagramCommandExecutionContext

    const result = await registry.execute(DiagramCmd.File.Reload, undefined, ctx)

    expect(result.ok).toBe(true)
    expect(openFromFile).toHaveBeenCalledWith('f1', { force: true })
  })
})
