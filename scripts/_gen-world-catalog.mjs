/**
 * 生成 library-catalog-world-items.mjs
 */
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const dir = dirname(fileURLToPath(import.meta.url))
const outPath = join(dir, 'library-catalog-world-items.mjs')

const EXISTING_SLUGS = [
  'hero-spiderman', 'hero-iron-man', 'hero-captain-america', 'hero-batman-dc', 'hero-superman-dc',
  'supercar-ferrari-488', 'supercar-lamborghini-huracan', 'supercar-porsche-911',
  'plant-monstera', 'plant-fiddle-leaf-fig', 'plant-echeveria',
  'anime-one-piece', 'anime-demon-slayer', 'anime-attack-on-titan',
  'transformers-optimus-prime', 'transformers-bumblebee',
  'motorcycle-ducati-panigale', 'motorcycle-harley-street',
  'history-terracotta-army', 'history-great-wall',
  'movie-inception', 'movie-spirited-away', 'movie-the-dark-knight',
  'illustration-vocaloid-miku', 'illustration-girl-with-pearl-earring',
  'ui-material-design-3', 'ui-ios-human-interface',
  'interior-scandinavian-living', 'interior-japanese-zen',
  'industrial-alessi-kettle', 'industrial-dyson-v15',
  'supercar-mclaren-720s', 'plant-snake-plant', 'hero-wonder-woman', 'tf-megatron',
  'anime-your-name', 'motorcycle-honda-cb650r', 'history-angkor-wat'
]

function extractItemBlock(src, slug) {
  const re = new RegExp(`item\\(\\s*['"]${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`)
  const m = re.exec(src)
  const start = m ? m.index : -1
  if (start < 0) return null
  let depth = 0
  for (let i = start; i < src.length; i++) {
    const ch = src[i]
    if (ch === '(') depth++
    else if (ch === ')') {
      depth--
      if (depth === 0) return src.slice(start, i + 1)
    }
  }
  return null
}

const buildSrc = readFileSync(join(dir, 'build-library-catalog.mjs'), 'utf-8')
const extraSrc = readFileSync(join(dir, 'library-catalog-extra-items.mjs'), 'utf-8')
const existingBlocks = []
for (const slug of EXISTING_SLUGS) {
  const block = extractItemBlock(buildSrc, slug) ?? extractItemBlock(extraSrc, slug)
  if (!block) throw new Error(`Missing existing item: ${slug}`)
  existingBlocks.push(block.replace(/^item\(/, 'mk('))
}

function esc(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r\n/g, '\\n')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\n')
}

function fmtItem(slug, cat, sub, name, summary, description, tags, specs) {
  const tagsStr = tags.map((t) => `'${esc(t)}'`).join(', ')
  const specLines = Object.entries(specs)
    .map(([k, v]) => `        ${k}: '${esc(v)}',`)
    .join('\n')
  return `    mk(
      '${esc(slug)}',
      '${esc(cat)}',
      '${esc(sub)}',
      '${esc(name)}',
      '${esc(summary)}',
      '${esc(description)}',
      [${tagsStr}],
      {
${specLines}
      }
    )`
}

function d(p1, l2, p2, l3, p3) {
  return `${p1}\n\n${l2}：${p2}\n\n${l3}：${p3}`
}

/** Compact new entries: slug, cat, sub, name, summary, desc, tags, specs */
const NEW = [
  // —— hero-marvel +9 ——
  ['hero-thor', 'superhero', 'hero-marvel', '雷神 Thor', '漫威阿斯加德王子，妙尔尼尔之锤与雷霆之力，复仇者核心战力。', d('雷神（Thor）由 Stan Lee 与 Jack Kirby 创作，1962 年《Journey into Mystery》#83 登场。托尔·奥丁森可使用风暴与飞行，武器妙尔尼尔仅「值得之人」可举起。\n\nMCU 由克里斯·海姆斯沃斯饰演，与洛基、彩虹桥、诸神黄昏等北欧神话元素交织。', '能力要点', '雷霆、飞行、神力、武器召唤', '相关作品', '《雷神》三部曲、《复仇者联盟》系列'), ['漫威', '阿斯加德', '雷霆'], { 宇宙: '漫威 Marvel', 首次登场: '1962', 本名: '托尔·奥丁森', 武器: '妙尔尼尔', 所属: '复仇者联盟', 'MCU饰演': '克里斯·海姆斯沃斯' }],
  ['hero-hulk', 'superhero', 'hero-marvel', '绿巨人 Hulk', '布鲁斯·班纳受伽马辐射后愤怒化身绿巨人，力量随情绪增强。', d('绿巨人 1962 年登场，布鲁斯·班纳为物理学家，伽马事故使其愤怒时变身为绿色巨兽，愈怒愈强。\n\nMCU 与黑寡妇、钢铁侠有深刻互动；动画与漫画有多重人格版本。', '能力要点', '超级力量、跳跃、近乎刀枪不入', '相关作品', '《无敌浩克》《复仇者联盟》'), ['漫威', '伽马', '力量型'], { 宇宙: '漫威 Marvel', 首次登场: '1962', 本名: '布鲁斯·班纳', 触发: '愤怒', 特点: '力量随情绪上升' }],
  ['hero-black-widow', 'superhero', 'hero-marvel', '黑寡妇 Black Widow', '娜塔莎·罗曼诺夫，红房子特工转神盾局与复仇者顶尖间谍。', d('黑寡妇 1964 年登场，娜塔莎经红房子训练，精通武术与枪械，无超能力却是顶尖人类特工。\n\nMCU 斯嘉丽·约翰逊主演独立电影《黑寡妇》，与鹰眼战友情深刻。', '能力要点', '格斗、枪械、间谍、战术指挥', '相关作品', 'MCU《黑寡妇》'), ['漫威', '间谍', '复仇者'], { 宇宙: '漫威 Marvel', 首次登场: '1964', 本名: '娜塔莎·罗曼诺夫', 训练: '红房子', 'MCU饰演': '斯嘉丽·约翰逊' }],
  ['hero-doctor-strange', 'superhero', 'hero-marvel', '奇异博士 Doctor Strange', '史蒂芬·斯特兰奇习得卡玛泰姬神秘术，守护时间宝石的至尊法师。', d('奇异博士 1963 年登场，前神经外科医生在尼泊尔拜师古一，掌握传送门与时间法术。\n\nMCU 引入多元宇宙，与《蜘蛛侠：英雄无归》联动。', '能力要点', '魔法、维度旅行、时间法术', '相关作品', '《奇异博士》系列'), ['漫威', '魔法', '至尊法师'], { 宇宙: '漫威 Marvel', 首次登场: '1963', 本名: '史蒂芬·斯特兰奇', 神器: '阿戈摩托之眼', 'MCU饰演': '本尼迪克特·康伯巴奇' }],
  ['hero-black-panther', 'superhero', 'hero-marvel', '黑豹 Black Panther', '瓦坎达国王特查拉，心形草与振金战衣象征非洲未来主义。', d('黑豹 1966 年登场，为主流漫画首位非裔超级英雄主角。瓦坎达虚构科技强国，MCU《黑豹》获奥斯卡最佳影片提名。\n\n查德维克·博斯曼饰演影响深远。', '能力要点', '增强体能、振金战衣、天才战术', '相关作品', '《黑豹》《复仇者联盟3/4》'), ['漫威', '瓦坎达', '振金'], { 宇宙: '漫威 Marvel', 首次登场: '1966', 本名: '特查拉', 国家: '瓦坎达', 'MCU饰演': '查德维克·博斯曼' }],
  ['hero-deadpool', 'superhero', 'hero-marvel', '死侍 Deadpool', '韦德·威尔逊再生能力与打破第四墙的反英雄。', d('死侍 1991 年登场，癌症实验获再生能力，以幽默暴力与元叙事著称。\n\n瑞安·雷诺兹电影版 R 级成功。', '能力要点', '再生、武术、枪械', '相关作品', '《死侍》系列'), ['漫威', '反英雄', '再生'], { 宇宙: '漫威 Marvel', 首次登场: '1991', 本名: '韦德·威尔逊', 'MCU饰演': '瑞安·雷诺兹' }],
  ['hero-wolverine', 'superhero', 'hero-marvel', '金刚狼 Wolverine', '罗根，艾德曼合金爪与再生能力，X 战警标志角色。', d('金刚狼 1974 年登场，骨骼注入艾德曼合金，再生极强。休·杰克曼饰演二十余年成影史标志。\n\n故事涉及日本武士道篇章。', '能力要点', '再生、合金爪、感官强化', '相关作品', '《X战警》《LOGAN》'), ['漫威', 'X战警', '变种人'], { 宇宙: '漫威 Marvel', 首次登场: '1974', 本名: '罗根', 材料: '艾德曼合金', 饰演: '休·杰克曼' }],
  ['hero-scarlet-witch', 'superhero', 'hero-marvel', '猩红女巫 Scarlet Witch', '旺达·马克西莫夫，混沌魔法改写现实。', d('猩红女巫 1964 年登场，混沌魔法可改写现实。MCU《旺达幻视》《奇异博士2》探索 grief 与威胁。\n\n伊丽莎白·奥尔森主演。', '能力要点', '混沌魔法、现实改写', '相关作品', '《旺达幻视》'), ['漫威', '混沌魔法', '旺达'], { 宇宙: '漫威 Marvel', 首次登场: '1964', 本名: '旺达·马克西莫夫', 'MCU饰演': '伊丽莎白·奥尔森' }],
  ['hero-ant-man', 'superhero', 'hero-marvel', '蚁人 Ant-Man', '皮姆粒子缩放体型，量子领域关键。', d('蚁人 1962 年 Hank Pym 首任，后 Scott Lang 接棒。皮姆粒子可缩放并进入量子领域，MCU 时间旅行关键。\n\n保罗·路德主演喜剧风格。', '能力要点', '体型缩放、昆虫沟通', '相关作品', '《蚁人》三部曲'), ['漫威', '皮姆粒子', '量子'], { 宇宙: '漫威 Marvel', 科技: '皮姆粒子', 'MCU饰演': '保罗·路德' }],
  ['hero-hawkeye', 'superhero', 'hero-marvel', '鹰眼 Hawkeye', '克林特·巴顿顶尖射手，复仇者远程火力。', d('鹰眼 1964 年登场，无超能力神射。Disney+《鹰眼》引入凯特·毕肖普。\n\n与黑寡妇挚友搭档。', '能力要点', '神射、多功能箭', '相关作品', '《鹰眼》剧集'), ['漫威', '射手', '复仇者'], { 宇宙: '漫威 Marvel', 首次登场: '1964', 本名: '克林特·巴顿' }],
  ['hero-guardians-star-lord', 'superhero', 'hero-marvel', '星爵 Star-Lord', '彼得·奎尔率银河护卫队，半神血统与复古音乐。', d('星爵 1976 年漫画登场，MCU 克里斯·帕拉特主演。收藏 80 年代 Walkman，领导护卫队对抗宇宙威胁。\n\n《银河护卫队》三部曲口碑佳。', '能力要点', '飞行靴、元素枪', '相关作品', '《银河护卫队》'), ['漫威', '银河护卫队', '太空'], { 宇宙: '漫威 Marvel', 团队: '银河护卫队', 'MCU饰演': '克里斯·帕拉特' }],
  ['hero-silver-surfer', 'superhero', 'hero-marvel', '银色冲浪者 Silver Surfer', '诺林·拉德，行星吞噬者前使者，宇宙级英雄。', d('银色冲浪者 1966 年登场，乘冲浪板超光速旅行，掌握宇宙能量。\n\n哲学气质浓厚，粉丝期待电影改编。', '能力要点', '宇宙能量、超光速', '相关作品', '《神奇四侠》漫画'), ['漫威', '宇宙', '冲浪板'], { 宇宙: '漫威 Marvel', 首次登场: '1966', 本名: '诺林·拉德', 交通: '银色冲浪板' }]
]

// Load extended data from separate module
const { REST_NEW } = await import('./_gen-world-catalog-data.mjs')

const allNew = [...NEW, ...REST_NEW]
const newBlocks = allNew.map(([slug, cat, sub, name, summary, description, tags, specs]) =>
  fmtItem(slug, cat, sub, name, summary, description, tags, specs)
)

const header = `/**
 * 世界主题库 catalog 条目（超级英雄、超跑、植物、动漫等非猫狗大类）
 * 由 build-library-catalog.mjs 合并；每子类目标 ≥12 条
 */
export function worldCatalogItems(item) {
  const mk = (slug, cat, sub, name, summary, desc, tags, specs) =>
    item(slug, cat, sub, name, summary, desc, tags, specs)

  return [
`

const footer = `  ]
}
`

const body = [...existingBlocks, ...newBlocks].join(',\n\n')
writeFileSync(outPath, header + body + '\n' + footer, 'utf-8')

// verify counts
const text = readFileSync(outPath, 'utf-8')
const subCounts = {}
for (const m of text.matchAll(/'([^']+)',\s*\n\s*'([^']+)',\s*\n\s*'([^']+)'/g)) {
  const sub = m[3]
  if (sub.startsWith('hero-') || sub.startsWith('car-') || sub.startsWith('plant-') || sub.startsWith('anime-') || sub.startsWith('tf-') || sub.startsWith('moto-') || sub.startsWith('movie-') || sub.startsWith('ill-') || sub.startsWith('ui-') || sub.startsWith('int-') || sub.startsWith('id-') || sub.startsWith('hist-')) {
    subCounts[sub] = (subCounts[sub] || 0) + 1
  }
}
const bad = Object.entries(subCounts).filter(([, n]) => n < 12)
console.log('Wrote', outPath)
console.log('Total mk/item entries:', (text.match(/\bmk\(/g) || []).length)
console.log('Subcategories:', Object.keys(subCounts).length)
if (bad.length) {
  console.error('Under 12:', bad)
  process.exit(1)
}
