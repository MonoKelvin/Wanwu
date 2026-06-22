import { PixelCommandRegistry } from '@modules/library/pixel-art/app/command/PixelCommandRegistry'
import { registerCanvasCommands, registerToolSelectCommand } from '@modules/library/pixel-art/app/command/handlers/canvas'
import { registerLayerCommands } from '@modules/library/pixel-art/app/command/handlers/layer'
import { registerFileCommands, type FileCommandDeps } from '@modules/library/pixel-art/app/command/handlers/file'
import { registerCatalogCommands } from '@modules/library/pixel-art/app/command/handlers/catalog'
import type { PixelEditorSession } from '@modules/library/pixel-art/app/PixelEditorSession'
import type { IPixelEditorPort } from '@modules/library/pixel-art/interfaces/IPixelEditorPort'
import type { PixelRepositoryIpcAdapter } from '@modules/library/pixel-art/services/PixelRepositoryIpcAdapter'
import type { ToolId } from '@modules/library/pixel-art/domain/tools'

export interface RegisterPixelCommandsDeps extends FileCommandDeps {
  getSession: () => PixelEditorSession | null
  getPort: () => IPixelEditorPort | null
  repo: PixelRepositoryIpcAdapter
  onChange?: () => void
  setActiveTool?: (tool: ToolId) => void
}

export function registerPixelCommands(deps: RegisterPixelCommandsDeps): PixelCommandRegistry {
  const registry = new PixelCommandRegistry()
  const shared = {
    getPort: deps.getPort,
    getSession: deps.getSession,
    onChange: deps.onChange
  }
  registerCanvasCommands(registry, shared)
  registerToolSelectCommand(registry, { ...shared, setActiveTool: deps.setActiveTool })
  registerLayerCommands(registry, shared)
  registerFileCommands(registry, deps)
  registerCatalogCommands(registry, { repo: deps.repo })
  return registry
}
