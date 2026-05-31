import { mkdirSync } from 'fs'
import { join } from 'path'
import { ensureWanwuDataLayout, getWanwuPathLayout, type WanwuPathLayout } from '../data/paths'

export class MediaService {
  readonly layout: WanwuPathLayout

  constructor(basePath?: string) {
    const root = ensureWanwuDataLayout(basePath)
    this.layout = getWanwuPathLayout(root)
    mkdirSync(this.layout.media, { recursive: true })
  }

  get root(): string {
    return this.layout.root
  }

  resolvePath(relativePath: string): string {
    return join(this.layout.root, relativePath)
  }

  /** 相对 media/ 的路径 → 绝对路径 */
  resolveMediaPath(relativePath: string): string {
    return join(this.layout.media, relativePath.replace(/^\/+/, ''))
  }

  mediaDir(source: string, categoryId: string, itemId: string): string {
    const dir = join(this.layout.media, source, categoryId, itemId)
    mkdirSync(dir, { recursive: true })
    return dir
  }
}
