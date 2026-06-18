import { join } from 'node:path'
import type { WanwuPathLayout } from '@shared/lib/wanwuPaths'

/** 图鉴分类 SQLite 文件路径（每分类独立库） */
export function libraryCategoryDbFile(layout: WanwuPathLayout, categoryId: string): string {
  return join(layout.db, `library_${categoryId}.sqlite`)
}
