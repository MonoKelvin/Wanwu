import { mkdirSync } from 'fs'
import { join } from 'path'

export class MediaService {
  constructor(private readonly basePath: string) {
    mkdirSync(join(basePath, 'media'), { recursive: true })
  }

  resolvePath(relativePath: string): string {
    return join(this.basePath, relativePath)
  }

  mediaDir(source: string, categoryId: string, itemId: string): string {
    const dir = join(this.basePath, 'media', source, categoryId, itemId)
    mkdirSync(dir, { recursive: true })
    return dir
  }
}
