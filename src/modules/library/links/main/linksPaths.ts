import { join } from 'node:path'
import type { WanwuPathLayout } from '@shared/lib/wanwuPaths'

export function linksDbFile(layout: WanwuPathLayout): string {
  return join(layout.db, 'library_links.sqlite')
}
