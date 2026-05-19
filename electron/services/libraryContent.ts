import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import { resolveLibraryMediaAbsolute } from './libraryMedia'

/** 由 cover 路径推导 content.md 相对路径 */
export function contentPathFromCover(coverRel: string | null | undefined): string | null {
  if (!coverRel?.trim()) return null
  if (/\/content\.md$/i.test(coverRel)) return coverRel
  if (/\/cover\.(jpe?g|png|webp)$/i.test(coverRel)) {
    return coverRel.replace(/\/cover\.(jpe?g|png|webp)$/i, '/content.md')
  }
  const dir = coverRel.replace(/\/[^/]+$/, '')
  return dir ? `${dir}/content.md` : null
}

/** 修复历史 content / 描述中重复的 **** 加粗 */
export function normalizeMarkdownLabels(text: string): string {
  if (!text?.trim()) return ''
  return text
    .replace(/\*{4,}([^*]+?)\*{4,}/g, '**$1**')
    .replace(/\*{3}([^*]+?)\*{3}/g, '**$1**')
}

/** 优先读取资源目录 content.md，否则回退数据库 description */
export function readItemMarkdown(
  coverRel: string | null | undefined,
  fallbackDescription: string | null | undefined
): string | null {
  const rel = contentPathFromCover(coverRel)
  if (rel) {
    const abs = resolveLibraryMediaAbsolute(rel)
    if (abs && existsSync(abs)) {
      const text = normalizeMarkdownLabels(readFileSync(abs, 'utf-8').trim())
      if (text.length > 0) return text
    }
  }
  const fb = normalizeMarkdownLabels(fallbackDescription?.trim() ?? '')
  return fb || null
}

/** 将 Markdown 写入条目目录 content.md（与 cover 同目录） */
export function writeItemMarkdown(coverRel: string | null | undefined, content: string): void {
  const rel = contentPathFromCover(coverRel)
  if (!rel) return
  const abs = resolveLibraryMediaAbsolute(rel)
  if (!abs) return
  mkdirSync(dirname(abs), { recursive: true })
  const text = content?.trim() ?? ''
  writeFileSync(abs, text ? `${text}\n` : '', 'utf-8')
}
