import { join } from 'node:path'
import type { WanwuPathLayout } from '@shared/lib/wanwuPaths'

export function diagramsDbFile(layout: WanwuPathLayout): string {
  return join(layout.db, 'library_diagrams.sqlite')
}

export function diagramsMediaDir(layout: WanwuPathLayout): string {
  return join(layout.media, 'diagrams')
}
