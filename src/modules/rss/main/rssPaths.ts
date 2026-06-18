import { join } from 'node:path'
import type { WanwuPathLayout } from '@shared/lib/wanwuPaths'

export function rssDbFile(layout: WanwuPathLayout): string {
  return join(layout.db, 'rss.sqlite')
}
