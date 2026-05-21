/** slug → 百科/维基优先搜索词（条目 name 抓不到时使用） */
export const SEARCH_ALIASES = {
  'movie-2001-space-odyssey': ['2001太空漫游', '2001：太空漫游'],
  'movie-blade-runner-2049': ['银翼杀手2049', '银翼杀手2049'],
  'movie-die-hard': ['虎胆龙威', '虎胆龙威1'],
  'movie-dune': ['沙丘', '沙丘2021', '沙丘电影'],
  'movie-inception': ['盗梦空间'],
  'movie-interstellar': ['星际穿越'],
  'movie-james-bond-skyfall': ['007：大破天幕杀机', '007大破天幕杀机', '大破天幕杀机'],
  'movie-john-wick': ['疾速追杀', '疾速追杀1'],
  'movie-kill-bill': ['杀死比尔', '杀死比尔1'],
  'movie-spirited-away': ['千与千寻', '千と千尋の神隠し'],
  'movie-spirited-away-film': ['千与千寻'],
  'movie-studio-ghibli': ['吉卜力工作室', '吉卜力'],
  'movie-terminator-2': ['终结者2：审判日', '终结者2'],
  'movie-top-gun-maverick': ['壮志凌云2：独行侠', '壮志凌云2'],
  'book-wild-things': ['野兽国', '野兽出没的地方'],
  'anime-your-name': ['你的名字', '你的名字。', '君の名は。'],
  'game-zelda-botw': ['塞尔达传说：旷野之息', '旷野之息', 'ゼルダの伝説 ブレス オブ ザ ワイルド'],
  'chess-go-board': ['围棋', '围棋棋盘'],
  'chess-shogi-piece': ['将棋', '将棋驹'],
  'chess-staunton': ['斯汤顿棋', '国际象棋'],
  'coin-roman-denarius': ['古罗马第纳尔', '第纳尔'],
  'coin-us-100': ['100美元', '美元纸币', '100美元钞票', '美国一百美元纸币'],
  'fish-anglerfish': ['鮟鱇', '琵琶鱼'],
  'fish-clownfish': ['小丑鱼', '海葵鱼'],
  'fish-goldfish': ['金鱼'],
  'fish-salmon': ['大马哈鱼', '鲑鱼']
}

/**
 * @param {string} [slug]
 * @returns {string[]}
 */
export function aliasesForSlug(slug) {
  if (!slug) return []
  return SEARCH_ALIASES[slug] ?? []
}
