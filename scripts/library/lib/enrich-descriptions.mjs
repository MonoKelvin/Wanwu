import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { itemsRoot } from './items.mjs'

const GENERIC_MARKERS = [
  '扩展批次条目',
  '条目简介与延伸',
  '常见科普条目',
  '第三批扩充',
  '特征：行业代表性',
  '特征：生态与分布广泛',
  '特征：领域代表'
]

/** @param {string} categoryId */
function categoryBlurb(categoryId, raw) {
  const name = raw.name ?? ''
  const en = (name.match(/[（(]([^）)]+)[）)]/) ?? [])[1] ?? name.match(/[A-Za-z][A-Za-z0-9\s.-]+/)?.[0] ?? ''
  const tags = (raw.tags ?? []).slice(0, 4).join('、') || '—'

  const blocks = {
    cat: [
      `**品种概览**：${name}是家猫（Felis catus）选育品种，在猫协登记体系中有独立标准。`,
      `**外观特征**：被毛质地、头型耳位、眼色与体型是鉴别要点；不同血系在花纹与骨量上会有差异。`,
      `**性格与饲养**：多数适合室内伴侣饲养，需关注体重、梳毛频率、泌尿与口腔健康。`,
      `**标签**：${tags}`
    ],
    dog: [
      `**犬种概览**：${name}（${en}）在 FCI/AKC 等体系中有历史选育背景与用途定义。`,
      `**体态与运动**：肩高、骨量与被毛决定运动需求；工作犬/玩具犬在训练量上差异很大。`,
      `**饲养建议**：社会化、牵引习惯、关节与牙齿护理、按体型选择主食与运动量。`,
      `**标签**：${tags}`
    ],
    anime: [
      `**作品信息**：${name}为日本动画/漫画 IP，常涉及连载、剧场版或流媒体发行。`,
      `**类型与主题**：子类决定叙事基调（少年向、异世界、日常治愈等），影响受众与讨论语境。`,
      `**文化影响**：角色设定、作画风格与音乐常成为二次创作与周边生态基础。`,
      `**标签**：${tags}`
    ],
    supercar: [
      `**车型定位**：${name}代表超跑/性能车谱系中的设计取向（气动、轻量化、动力形式）。`,
      `**工程亮点**：车身比例、进气与扩散、悬挂与制动系统决定赛道与公路表现。`,
      `**收藏语境**：限量、赛事血统与设计师语言影响二级市场与文化符号价值。`,
      `**标签**：${tags}`
    ],
    plant: [
      `**植物学概览**：${name}在园艺与室内绿植场景中常见，需结合光照、湿度与基质管理。`,
      `**观赏特征**：叶形、花色、生长速度与株型决定摆放位置与修剪方式。`,
      `**养护要点**：浇水周期、施肥浓度、换盆与病虫害（红蜘蛛、介壳虫等）预防。`,
      `**标签**：${tags}`
    ],
    architecture: [
      `**建筑背景**：${name}为城市地标或历史构筑，体现特定年代的结构技术与文化象征。`,
      `**空间与材料**：立面语言、结构体系（拱券、悬索、壳体等）影响参观体验与摄影构图。`,
      `**遗产价值**：UNESCO、修复史与公众认知共同构成建筑叙事。`,
      `**标签**：${tags}`
    ],
    default: [
      `**概述**：${name}${en ? `（${en}）` : ''}在本分类中作为代表性条目，用于科普与视觉参考。`,
      `**特征**：${raw.summary || '见摘要字段。'}`,
      `**延伸**：可与同子类条目对照，理解设计/自然/文化史脉络。`,
      `**标签**：${tags}`
    ]
  }

  return (blocks[categoryId] ?? blocks.default).join('\n\n')
}

function needsEnrich(raw) {
  const d = (raw.description ?? '').trim()
  if (d.length < 180) return true
  return GENERIC_MARKERS.some((m) => d.includes(m))
}

function buildDescription(raw, categoryId) {
  const en = (raw.name ?? '').match(/[（(]([^）)]+)[）)]/)?.[1] ?? ''
  const head = `${raw.name}${en ? `（${en}）` : ''}：${raw.summary || ''}`.trim()
  const body = categoryBlurb(categoryId, raw)
  const specs = raw.specs ?? {}
  const specLines = Object.entries(specs)
    .filter(([, v]) => v != null && String(v).trim())
    .map(([k, v]) => `**${k}**：${v}`)
  const specBlock = specLines.length ? `\n\n**规格参数**\n\n${specLines.join('\n')}` : ''
  return `${head}\n\n${body}${specBlock}`
}

/**
 * @param {string} root
 * @param {{ category?: string|null, slug?: string|null, limit?: number }} [opts]
 */
export function enrichDescriptions(root, opts = {}) {
  const idir = itemsRoot(root)
  let updated = 0
  const limit = opts.limit > 0 ? opts.limit : Infinity

  for (const categoryId of readdirSync(idir)) {
    if (opts.category && categoryId !== opts.category) continue
    const categoryDir = join(idir, categoryId)
    if (!existsSync(categoryDir) || categoryId.startsWith('_')) continue

    for (const file of readdirSync(categoryDir).filter((f) => f.endsWith('.json') && !f.startsWith('_'))) {
      if (updated >= limit) return updated
      const p = join(categoryDir, file)
      const raw = JSON.parse(readFileSync(p, 'utf-8'))
      if (opts.slug && raw.slug !== opts.slug) continue
      if (!needsEnrich(raw)) continue

      raw.description = buildDescription(raw, categoryId)
      if (!raw.summary?.trim()) {
        raw.summary = raw.description.split('\n')[0].slice(0, 120)
      }
      writeFileSync(p, JSON.stringify(raw, null, 2) + '\n', 'utf-8')
      updated++
    }
  }
  return updated
}
