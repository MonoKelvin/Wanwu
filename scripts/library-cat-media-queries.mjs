/**
 * 「猫」大类 Pixabay 搜索词（合并进 assets/seed/library/media.json）
 * category 固定 animals，requiredTags 含 cat 提升匹配准确度
 */
export const CAT_MEDIA_QUERIES = {
  'cat-british-shorthair': {
    query: 'british shorthair cat portrait',
    matchTags: ['cat', 'british', 'shorthair']
  },
  'cat-maine-coon': { query: 'maine coon cat', matchTags: ['cat', 'maine', 'coon'] },
  'cat-ragdoll': { query: 'ragdoll cat blue eyes', matchTags: ['cat', 'ragdoll'] },
  'cat-dragon-li': { query: 'tabby cat portrait', matchTags: ['cat', 'tabby'] },
  'cat-japanese-bobtail': { query: 'japanese bobtail cat', matchTags: ['cat', 'bobtail'] },
  'cat-persian': { query: 'persian cat fluffy', matchTags: ['cat', 'persian'] },
  'cat-scottish-fold': { query: 'scottish fold cat', matchTags: ['cat', 'fold'] },
  'cat-russian-blue': { query: 'russian blue cat', matchTags: ['cat', 'russian', 'blue'] },
  'cat-norwegian-forest': { query: 'norwegian forest cat', matchTags: ['cat', 'norwegian'] },
  'cat-chartreux': { query: 'chartreux cat grey', matchTags: ['cat', 'chartreux', 'grey'] },
  'cat-turkish-angora': { query: 'turkish angora white cat', matchTags: ['cat', 'angora', 'white'] },
  'cat-turkish-van': { query: 'turkish van cat', matchTags: ['cat', 'van'] },
  'cat-devon-rex': { query: 'devon rex cat', matchTags: ['cat', 'rex'] },
  'cat-cornish-rex': { query: 'cornish rex cat', matchTags: ['cat', 'rex'] },
  'cat-sphynx': { query: 'sphynx hairless cat', matchTags: ['cat', 'sphynx'] },
  'cat-manx': { query: 'manx cat tailless', matchTags: ['cat', 'manx'] },
  'cat-exotic-shorthair': { query: 'exotic shorthair cat flat face', matchTags: ['cat', 'persian'] },
  'cat-nebelung': { query: 'russian blue longhair cat', matchTags: ['cat', 'blue'] },
  'cat-birman': { query: 'birman cat blue eyes', matchTags: ['cat', 'birman'] },
  'cat-american-shorthair': { query: 'american shorthair tabby cat', matchTags: ['cat', 'tabby'] },
  'cat-american-curl': { query: 'american curl cat', matchTags: ['cat', 'curl'] },
  'cat-american-bobtail': { query: 'american bobtail cat', matchTags: ['cat', 'bobtail'] },
  'cat-bengal': { query: 'bengal cat leopard', matchTags: ['cat', 'bengal'] },
  'cat-bombay': { query: 'black cat copper eyes', matchTags: ['cat', 'black'] },
  'cat-savannah': { query: 'savannah cat serval', matchTags: ['cat', 'savannah'] },
  'cat-ocicat': { query: 'ocicat spotted cat', matchTags: ['cat', 'ocicat'] },
  'cat-ragamuffin': { query: 'ragdoll longhair cat', matchTags: ['cat', 'ragdoll'] },
  'cat-selkirk-rex': { query: 'selkirk rex curly cat', matchTags: ['cat', 'rex'] },
  'cat-laperm': { query: 'curly cat laperm', matchTags: ['cat', 'curly'] },
  'cat-munchkin': { query: 'munchkin cat short legs', matchTags: ['cat', 'munchkin'] },
  'cat-pixiebob': { query: 'pixie bob cat wild', matchTags: ['cat', 'bobtail'] },
  'cat-siamese': { query: 'siamese cat seal point', matchTags: ['cat', 'siamese'] },
  'cat-korat': { query: 'korat cat silver blue', matchTags: ['cat', 'korat'] },
  'cat-burmese': { query: 'burmese cat golden eyes', matchTags: ['cat', 'burmese'] },
  'cat-orange-tabby': { query: 'orange tabby cat', matchTags: ['cat', 'orange', 'tabby'] },
  'cat-cow-cat': { query: 'black and white cat', matchTags: ['cat', 'black', 'white'] },
  'cat-tortoiseshell': { query: 'tortoiseshell cat', matchTags: ['cat', 'tortoiseshell'] },
  'cat-linqing-lion': { query: 'white longhair cat', matchTags: ['cat', 'white'] },
  'cat-jianzhou': { query: 'chinese domestic cat', matchTags: ['cat'] },
  'cat-chinese-white': { query: 'white cat portrait', matchTags: ['cat', 'white'] },
  'cat-singapura': { query: 'singapura cat small', matchTags: ['cat', 'singapura'] },
  'cat-abyssinian': { query: 'abyssinian cat ticked', matchTags: ['cat', 'abyssinian'] },
  'cat-calico-chinese': { query: 'calico cat tricolor', matchTags: ['cat', 'calico'] },
  'cat-kurilian-bobtail': { query: 'kurilian bobtail cat', matchTags: ['cat', 'bobtail'] },
  'cat-japanese-bobtail-longhair': {
    query: 'japanese bobtail longhair cat',
    matchTags: ['cat', 'bobtail']
  },
  'cat-mi-ke': { query: 'calico japanese cat', matchTags: ['cat', 'calico'] },
  'cat-japanese-domestic': { query: 'japanese cat street', matchTags: ['cat', 'japan'] },
  'cat-toybob': { query: 'small cat portrait', matchTags: ['cat', 'kitten'] },
  'cat-hokkaido-cat': { query: 'fluffy cat winter', matchTags: ['cat', 'fluffy'] },
  'cat-okinawa-cat': { query: 'street cat tropical', matchTags: ['cat'] },
  'cat-maneki-neko': { query: 'maneki neko lucky cat', matchTags: ['cat', 'lucky'] },
  'cat-japanese-chin-longhair': { query: 'longhair cat oriental', matchTags: ['cat', 'longhair'] }
}

/** 合并为 media.json 条目格式 */
export function catMediaManifestEntries() {
  const base = { category: 'animals', provider: 'pixabay', requiredTags: ['cat'] }
  return Object.fromEntries(
    Object.entries(CAT_MEDIA_QUERIES).map(([slug, cfg]) => [
      slug,
      { ...base, query: cfg.query, matchTags: cfg.matchTags }
    ])
  )
}
