/**
 * 生成 assets/seed/library/catalog.json（v6 细分类 + 详实条目）
 * 运行: node scripts/build-library-catalog.mjs
 */
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { catCatalogItems } from './library-catalog-cat-items.mjs'
import { dogCatalogItems } from './library-catalog-dog-items.mjs'
import { worldCatalogItems } from './library-catalog-world-items.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outPath = join(root, 'assets', 'seed', 'library', 'catalog.json')

/** 将段落描述转为 Markdown：段首「标签：」加粗，段间空行保留 */
function desc(text) {
  return text
    .split('\n\n')
    .map((block, index) => {
      const trimmed = block.trim()
      const m = trimmed.match(/^([^：\n]{2,16})：([\s\S]*)$/)
      if (m && index > 0) return `**${m[1]}**：${m[2]}`
      return trimmed
    })
    .join('\n\n')
}

function item(
  slug,
  categoryId,
  subCategoryId,
  name,
  summary,
    description,
    tags,
    specs
  ) {
  const base = `library/${categoryId}/${slug}`
  return {
    slug,
    categoryId,
    subCategoryId,
    name,
    summary,
    description: desc(description),
    tags,
    specs,
    coverFile: `${base}/cover.jpg`,
    galleryFiles: [
      `${base}/gallery-01.jpg`,
      `${base}/gallery-02.jpg`,
      `${base}/gallery-03.jpg`
    ],
    mediaProvider: 'pixabay'
  }
}

const items = [
  // —— 猫 ——
  item(
    'cat-british-shorthair',
    'cat',
    'cat-europe',
    '英国短毛猫',
    '源自英国的短毛品种，圆脸厚毛、性格沉稳，是最经典的室内伴侣猫之一。',
    '英国短毛猫（British Shorthair）在 19 世纪由英国选育定型，被 CFA、TICA、FIFe 等协会认可。典型外观为圆头、圆眼、致密短毛与「泰迪熊」体态。性格通常安静、适应力强，适合公寓饲养。\n\n饲养要点：控制体重（易发胖）、每周梳毛 1–2 次、定期洁牙与疫苗。常见毛色包括蓝色（最知名）、蓝乳、银渐层等。\n\n相关：与法国 Chartreux、美国本土短毛猫在体型上有相似之处，但头型与毛质不同。',
    ['短毛', '欧洲', '室内猫', '英国'],
    {
      分类: '欧洲品种',
      原产地: '英国',
      体重: '4–8 kg',
      寿命: '12–17 年',
      被毛: '短而浓密',
      协会认可: 'CFA / TICA / FIFe',
      性格: '沉稳、亲人、独立'
    }
  ),
  item(
    'cat-maine-coon',
    'cat',
    'cat-americas',
    '缅因猫',
    '来自美国东北部的大型长毛猫，耳簇、长尾、性格友善，有「温柔的巨人」之称。',
    '缅因猫（Maine Coon）是美国缅因州代表性家猫品种，可能由当地长毛猫与自然选择形成。体型为家猫中最大之一，双层被毛适应寒冷气候，耳尖簇毛与蓬松尾为标志。\n\n性格聪明、爱玩、常跟随主人，对水兴趣较高。需定期梳毛防打结，幼猫成长期需优质高蛋白饮食。\n\n相关：常与美国本土长毛猫、挪威森林猫在外观上被比较；是北美最早参加猫展的品种之一。',
    ['长毛', '大型', '美洲', '美国'],
    {
      分类: '美洲品种',
      原产地: '美国',
      体重: '6–11 kg（公猫更大）',
      寿命: '12–15 年',
      特征: '耳簇、长尾、虎斑常见',
      性格: '友善、活泼、聪明'
    }
  ),
  item(
    'cat-ragdoll',
    'cat',
    'cat-americas',
    '布偶猫',
    '1960 年代在美国选育的大型长毛猫，松弛抱持时全身放松，蓝眼、重点色，称「小狗猫」。',
    '布偶猫（Ragdoll）由 Ann Baker 在美国加州选育，名称来自被抱起时肌肉放松的习性。典型为双色/重点色图案与湛蓝眼睛，被毛丝质、需定期梳理。\n\n性格极度亲人、叫声轻柔，适合室内饲养，不宜长期放养。注意遗传性心肌病（HCM）筛查与正规猫舍血统。\n\n相关：与伯曼猫、暹罗猫在重点色基因上有渊源讨论；是热门伴侣猫品种之一。',
    ['长毛', '蓝眼', '重点色', '美国'],
    {
      分类: '美洲品种',
      原产地: '美国',
      体重: '4.5–9 kg',
      寿命: '12–15 年',
      眼色: '蓝色',
      毛色模式: '重点色 / 双色',
      性格: '温顺、粘人'
    }
  ),
  item(
    'cat-dragon-li',
    'cat',
    'cat-china',
    '中华狸花猫',
    '中国本土自然猫种，狸花纹路、强健独立，被 CFA 以「Chinese Li Hua」名称认可。',
    '中华狸花猫（狸花猫）为中国广泛分布的本土猫，以 M 额纹、鱼骨刺虎斑与黄绿眼为典型特征。2010 年 CFA 接受「Chinese Li Hua」为标准名称，是较少被国际协会认可的中国本土猫。\n\n性格机警、捕猎能力强、适应力出色。饲养建议：提供攀爬与狩猎类游戏、均衡饮食、绝育与驱虫。\n\n相关：与「橘猫」「奶牛猫」等本土毛色类型常并列讨论；在传统文化中常被视为家宅猫。',
    ['狸花', '中国', '本土', '短毛'],
    {
      分类: '中国品种',
      原产地: '中国',
      体重: '3.5–6 kg',
      寿命: '12–16 年',
      毛色: '棕狸纹最常见',
      国际名称: 'Chinese Li Hua（CFA）',
      性格: '独立、聪明、活泼'
    }
  ),
  item(
    'cat-japanese-bobtail',
    'cat',
    'cat-japan',
    '日本短尾猫',
    '日本象征性家猫，短尾、后高前低体态，常出现在招猫等传统文化形象中。',
    '日本短尾猫（Japanese Bobtail）在日本有千年以上饲养史，短尾为自然突变所致，并非人工断尾。三花色「三毛猫」在日本文化中象征好运。\n\n被毛可为短毛或长毛，体态轻盈、跳跃力强。性格外向、爱交流。日本多个地区对本土猫有保护倡议。\n\n相关：招猫（Maneki-neko）形象多基于此品种；与美国短尾猫为不同基因突变类型。',
    ['短尾', '日本', '三花', '亚洲'],
    {
      分类: '日本品种',
      原产地: '日本',
      体重: '2.5–5.5 kg',
      寿命: '15–18 年',
      标志: '短尾、修长四肢',
      文化: '招猫、三毛猫象征',
      性格: '活泼、亲人、爱叫'
    }
  ),

  ...worldCatalogItems(item),
  ...catCatalogItems(item),
  ...dogCatalogItems(item)
]
/** 重建 catalog 时保留已有配图归属（由 seed-library-media 写入） */
function mergeExistingMediaFields(nextItems, catalogPath) {
  if (!existsSync(catalogPath)) return nextItems
  try {
    const prev = JSON.parse(readFileSync(catalogPath, 'utf-8'))
    const bySlug = new Map((prev.items ?? []).map((i) => [i.slug, i]))
    return nextItems.map((entry) => {
      const old = bySlug.get(entry.slug)
      if (!old) return entry
      return {
        ...entry,
        ...(old.coverAttribution ? { coverAttribution: old.coverAttribution } : {}),
        ...(old.galleryAttributions?.length
          ? { galleryAttributions: old.galleryAttributions }
          : {})
      }
    })
  } catch {
    return nextItems
  }
}

const mergedItems = mergeExistingMediaFields(items, outPath)

const catalog = {
  version: 7,
  mediaProvider: 'pixabay',
  mediaConfigVersion: 2,
  items: mergedItems
}

writeFileSync(outPath, JSON.stringify(catalog, null, 2), 'utf-8')
console.log(`Wrote ${items.length} items to ${outPath}`)

// 同步全库 Pixabay 搜索配置
try {
  const { spawnSync } = await import('child_process')
  const r = spawnSync(process.execPath, ['scripts/sync-library-media-manifest.mjs'], {
    cwd: root,
    stdio: 'inherit'
  })
  if (r.status !== 0) console.warn('sync media 未成功，可手动运行 npm run seed:library:sync-media')
} catch {
  /* 构建 catalog 不阻断 */
}
