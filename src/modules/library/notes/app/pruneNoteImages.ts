import type { NoteImage } from '@shared/types/notes'
import { collectNoteImageIdsFromHtml } from '@modules/library/notes/lib/noteImageContent'

export const IMAGE_PRUNE_GRACE_MS = 3000

/**
 * 删除正文中未引用的便笺图片（上传后未插入等），带宽限期避免误删。
 */
export async function pruneUnreferencedNoteImages(
  images: NoteImage[],
  contentHtml: string,
  removeImage: (imageId: string) => Promise<boolean>
): Promise<void> {
  const referenced = collectNoteImageIdsFromHtml(contentHtml)
  const now = Date.now()
  for (const image of [...images]) {
    if (referenced.has(image.id)) continue
    const age = now - new Date(image.createdAt).getTime()
    if (!Number.isFinite(age) || age < IMAGE_PRUNE_GRACE_MS) continue
    await removeImage(image.id)
  }
}
