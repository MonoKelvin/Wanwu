import { ipcMain, type WebContents } from 'electron'
import type { DiagramService } from './service/service'
import {
  executeMainDiagramCommand,
  isMainProcessCommand,
  isRendererProcessCommand
} from './service/ipcCommands'
import type {
  DiagramCommandEnvelope,
  DiagramCommandResult
} from '@modules/library/diagrams/app/command/domain/types'

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

      for (const cmd of params.cmds) {
        let result: DiagramCommandResult
        if (isMainProcessCommand(cmd.type)) {
          result = await executeMainDiagramCommand(service, cmd)
        } else if (isRendererProcessCommand(cmd.type)) {
          const batch = await invokeRendererCommands(event.sender, [cmd])
          result = batch[0] ?? { ok: false, code: 'INTERNAL', message: '渲染进程无返回' }
        } else {
          result = { ok: false, code: 'UNKNOWN_COMMAND', message: `未知命令: ${cmd.type}` }
        }
        results.push(result)
        if (stopOnError && !result.ok) break
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
