import { ipcMain, type WebContents } from 'electron'
import type { DiagramService } from '../services/diagrams/service'
import {
  executeMainDiagramCommand,
  isMainProcessCommand,
  isRendererProcessCommand
} from '../services/diagrams/ipcCommands'
import type { DiagramCommandEnvelope } from '../../src/modules/library/diagrams/domain/commands/types'
import type { DiagramCommandResult } from '../../src/modules/library/diagrams/domain/commands/types'

const pendingRenderer = new Map<
  string,
  { resolve: (v: DiagramCommandResult[]) => void; reject: (e: Error) => void }
>()

export function registerDiagramCommandBridge(getService: () => DiagramService | null): void {
  ipcMain.on(
    'diagrams:run-commands-result',
    (_e, payload: { requestId: string; results: DiagramCommandResult[] }) => {
      const pending = pendingRenderer.get(payload.requestId)
      if (pending) {
        pendingRenderer.delete(payload.requestId)
        pending.resolve(payload.results)
      }
    }
  )

  ipcMain.handle(
    'diagrams:executeCommands',
    async (
      event,
      params: {
        cmds: DiagramCommandEnvelope[]
        stopOnError?: boolean
      }
    ): Promise<DiagramCommandResult[]> => {
      const service = getService()
      if (!service) {
        return params.cmds.map(() => ({
          ok: false,
          code: 'INTERNAL',
          message: '流程图服务未就绪'
        }))
      }

      const stopOnError = params.stopOnError !== false
      const results: DiagramCommandResult[] = []
      const rendererBatch: DiagramCommandEnvelope[] = []

      for (const cmd of params.cmds) {
        if (isMainProcessCommand(cmd.type)) {
          const result = executeMainDiagramCommand(service, cmd)
          results.push(result)
          if (stopOnError && !result.ok) break
        } else if (isRendererProcessCommand(cmd.type)) {
          rendererBatch.push(cmd)
        } else {
          results.push({ ok: false, code: 'UNKNOWN_COMMAND', message: `未知命令: ${cmd.type}` })
          if (stopOnError) break
        }
      }

      if (rendererBatch.length > 0) {
        const rendererResults = await invokeRendererCommands(event.sender, rendererBatch)
        results.push(...rendererResults)
      }

      return results
    }
  )
}

function invokeRendererCommands(
  sender: WebContents,
  cmds: DiagramCommandEnvelope[]
): Promise<DiagramCommandResult[]> {
  const requestId = crypto.randomUUID()
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRenderer.delete(requestId)
      reject(new Error('渲染进程命令执行超时'))
    }, 30000)

    pendingRenderer.set(requestId, {
      resolve: (v) => {
        clearTimeout(timeout)
        resolve(v)
      },
      reject: (e) => {
        clearTimeout(timeout)
        reject(e)
      }
    })

    if (sender.isDestroyed()) {
      clearTimeout(timeout)
      pendingRenderer.delete(requestId)
      reject(new Error('渲染进程不可用'))
      return
    }

    sender.send('diagrams:run-commands', { requestId, cmds })
  })
}
