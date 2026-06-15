import {
  CommandCatalog,
  CommandDispatcher,
  CommandExecutionLog,
  CommandManager,
  CommandPipeline,
  GuardMiddleware,
  HandlerRegistry,
  TimingMiddleware,
  type ICommandContributor
} from '@app/command'
import { diagramsCommandContributor } from '@modules/library/diagrams/app/command/DiagramCommandContributor'

export interface CommandRuntime {
  manager: CommandManager
  catalog: CommandCatalog
  registry: HandlerRegistry
  pipeline: CommandPipeline
}

export function createCommandRuntime(contributors: ICommandContributor[] = []): CommandRuntime {
  const registry = new HandlerRegistry()
  const pipeline = new CommandPipeline()
  const catalog = new CommandCatalog()
  pipeline.use(new GuardMiddleware(catalog))
  pipeline.use(new TimingMiddleware())

  const dispatcher = new CommandDispatcher(registry, pipeline)
  const log = new CommandExecutionLog({ maxEntries: 200 })
  const manager = new CommandManager(dispatcher, log)

  const allContributors = [diagramsCommandContributor, ...contributors]
  for (const contributor of allContributors) {
    contributor.contribute({ catalog, handlers: registry, pipeline })
  }

  return { manager, catalog, registry, pipeline }
}
