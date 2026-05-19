/**
 * 从 catalog 条目的 coverFile 解析磁盘目录（兼容历史短 slug 目录名）
 */
export function libraryRelDirFromItem(item) {
  const cover = item.coverFile?.replace(/\\/g, '/')
  const m = cover?.match(/^library\/([^/]+)\/([^/]+)\/cover\.jpg$/)
  if (m) return { categoryId: m[1], mediaDir: m[2] }
  return { categoryId: item.categoryId, mediaDir: item.slug }
}

/** @param {string} assetsLib @param {object} item */
export function itemMediaDirectory(assetsLib, item) {
  const { categoryId, mediaDir } = libraryRelDirFromItem(item)
  return { categoryId, mediaDir, dir: `${categoryId}/${mediaDir}` }
}
