import { shallowRef, type Ref, type ShallowRef } from 'vue'
import { createPixelCommandBus, type CreatePixelCommandBusOptions } from '@modules/library/pixel-art/app/command/createPixelCommandBus'
import type { IPixelCommandBus } from '@modules/library/pixel-art/app/command/PixelCommandRegistry'
import { createPixelTransactionManager } from '@modules/library/pixel-art/app/transaction/createPixelTransactionManager'
import type { TransactionManager } from '@app/transaction'
import type { PixelEditorSession } from '@modules/library/pixel-art/app/PixelEditorSession'
import type { PixelCanvasEngine } from '@modules/library/pixel-art/services/PixelCanvasEngine'
import type { PixelRepositoryIpcAdapter } from '@modules/library/pixel-art/services/PixelRepositoryIpcAdapter'
import type { ToolId } from '@modules/library/pixel-art/domain/tools'

export interface PixelEditorCommandSetup {
  bus: IPixelCommandBus
  transactionManager: ShallowRef<TransactionManager | null>
}

export function usePixelEditorCommandSetup(options: {
  getSession: () => PixelEditorSession | null
  getPort: () => PixelCanvasEngine | null
  repo: PixelRepositoryIpcAdapter
  activeTool: Ref<ToolId>
  onChange?: () => void
  onSave?: () => void | Promise<void>
  onSaveAs?: () => void | Promise<void>
  onExport?: (payload: Record<string, unknown>) => void | Promise<void>
  onNew?: () => void | Promise<void>
}): PixelEditorCommandSetup {
  const transactionManager = shallowRef<TransactionManager | null>(null)

  const bus = createPixelCommandBus({
    getSession: options.getSession,
    getPort: options.getPort,
    repo: options.repo,
    onChange: options.onChange,
    setActiveTool: (tool) => {
      options.activeTool.value = tool
    },
    onSave: options.onSave,
    onSaveAs: options.onSaveAs,
    onExport: options.onExport,
    onNew: options.onNew
  } satisfies CreatePixelCommandBusOptions)

  const session = options.getSession()
  const port = options.getPort()
  if (session?.fileId && port) {
    transactionManager.value = createPixelTransactionManager(session.fileId, port)
  }

  return { bus, transactionManager }
}
