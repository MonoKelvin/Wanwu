import type { DiagramEditorSession } from '@modules/library/diagrams/app/DiagramEditorSession'
import type { IDiagramRepositoryPort } from '@modules/library/diagrams/interfaces/IDiagramRepositoryPort'
import type { TransactionManager } from '@app/transaction'
import { DiagramCommandRegistry } from '@modules/library/diagrams/app/command/DiagramCommandRegistry'
import { registerCatalogCommands } from '@modules/library/diagrams/app/command/catalogCommands'
import { registerDocumentContentCommands } from '@modules/library/diagrams/app/command/documentContentCommands'
import { registerFileEditorCommands } from '@modules/library/diagrams/app/command/fileEditorCommands'
import { registerPageCommands } from '@modules/library/diagrams/app/command/pageCommands'

export interface DiagramCommandRegistryDeps {
  getSession: () => DiagramEditorSession | null
  getTransactionManager?: () => TransactionManager | null
  repo: IDiagramRepositoryPort
}

/** 流程图模块所有命令的注册入口 */
export function registerDiagramCommands(_deps: DiagramCommandRegistryDeps): DiagramCommandRegistry {
  const registry = new DiagramCommandRegistry()
  registerFileEditorCommands(registry)
  registerPageCommands(registry)
  registerCatalogCommands(registry)
  registerDocumentContentCommands(registry)
  return registry
}
