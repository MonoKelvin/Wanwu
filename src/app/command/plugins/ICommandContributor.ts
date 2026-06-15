import type { CommandCatalog } from '../plugins/CommandCatalog'
import type { HandlerRegistry } from '../core/HandlerRegistry'
import type { CommandPipeline } from '../core/CommandPipeline'

export interface CommandContributorContext {
  readonly catalog: CommandCatalog
  readonly handlers: HandlerRegistry
  readonly pipeline: CommandPipeline
}

export interface ICommandContributor {
  readonly id: string
  contribute(reg: CommandContributorContext): void
}
