import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { extname, join } from 'path'
import { randomUUID } from 'crypto'
import {
  getLibraryAssetsRoot,
  resolveItemCoverRelative,
  resolveLibraryMediaAbsolute,
  slugDirCandidates
} from './libraryMedia'

export function resolveItemMediaDir(categoryId: string, slug: string | null | undefined): string {
  const libRoot = join(getLibraryAssetsRoot(), 'library', categoryId)
  if (slug?.trim()) {
    for (const dir of slugDirCandidates(categoryId, slug)) {
      if (existsSync(join(libRoot, dir))) return dir
    }
    return slugDirCandidates(categoryId, slug)[0] ?? slug.trim()
  }
  return 'item'
}

export function pickImageExtension(sourcePath: string): string {
  const ext = extname(sourcePath).toLowerCase()
  if (ext === '.jpeg') return '.jpg'
  if (['.jpg', '.png', '.webp'].includes(ext)) return ext
  return '.jpg'
}

export interface UploadItemImageParams {
  itemId: string
  categoryId: string
  slug: string | null
  coverPathDb: string | null
  sourceFilePath: string
}

export interface UploadItemImageResult {
  relativePath: string
  isCover: boolean
}

/** 拷贝用户图片到库目录，返回相对路径与是否为封面 */
export function copyUserImageToLibrary(params: UploadItemImageParams): UploadItemImageResult {
  const { itemId, categoryId, slug, coverPathDb, sourceFilePath } = params
  if (!existsSync(sourceFilePath)) throw new Error('文件不存在')

  const mediaDir = resolveItemMediaDir(categoryId, slug)
  const ext = pickImageExtension(sourceFilePath)
  const dirAbs = join(getLibraryAssetsRoot(), 'library', categoryId, mediaDir)
  mkdirSync(dirAbs, { recursive: true })

  const coverRel = resolveItemCoverRelative({
    coverPath: coverPathDb,
    categoryId,
    slug
  })
  const hasCover = Boolean(coverRel && resolveLibraryMediaAbsolute(coverRel))

  if (!hasCover) {
    const filename = ext === '.jpg' ? 'cover.jpg' : `cover${ext}`
    const relativePath = `library/${categoryId}/${mediaDir}/${filename}`
    copyFileSync(sourceFilePath, join(dirAbs, filename))
    return { relativePath, isCover: true }
  }

  let maxIdx = 0
  const prefix = join(dirAbs, 'gallery-')
  if (existsSync(dirAbs)) {
    for (const name of readdirSync(dirAbs)) {
      const m = name.match(/^gallery-(\d+)\./i)
      if (m) maxIdx = Math.max(maxIdx, parseInt(m[1], 10))
    }
  }
  const next = maxIdx + 1
  const filename = `gallery-${String(next).padStart(2, '0')}${ext === '.jpg' ? '.jpg' : ext}`
  const relativePath = `library/${categoryId}/${mediaDir}/${filename}`
  copyFileSync(sourceFilePath, join(dirAbs, filename))
  return { relativePath, isCover: false }
}
