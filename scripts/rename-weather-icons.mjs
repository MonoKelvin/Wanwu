/**
 * 将 assets/icons/weather 下中文命名图标重命名为 weather-{slug}-{dark|light}.svg
 * 用法: node scripts/rename-weather-icons.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dir = path.resolve(__dirname, '../assets/icons/weather')

/** 中文现象名 → 英文 slug（与 weatherIconIds 一致，不含 weather- 前缀） */
const CN_TO_SLUG = {
  晴天: 'sun',
  晴_夜: 'sun-night',
  晴间多云: 'partly-cloudy',
  晴间多云_夜: 'partly-cloudy-night',
  少云: 'few-clouds',
  少云_夜: 'few-clouds-night',
  多云: 'cloudy',
  多云_夜: 'cloudy-night',
  阴天: 'overcast',
  阵雨: 'shower',
  阵雨_夜: 'shower-night',
  强阵雨: 'shower-heavy',
  强阵雨_夜: 'shower-heavy-night',
  雷阵雨: 'thunderstorm',
  强雷阵雨: 'thunderstorm-heavy',
  雷阵雨伴有冰雹: 'thunderstorm-hail',
  小雨: 'rain-light',
  中雨: 'rain-medium',
  大雨: 'rain-heavy',
  暴雨: 'rain-storm',
  大暴雨: 'rain-storm-heavy',
  特大暴雨: 'rain-storm-extreme',
  极端降雨: 'rain-extreme',
  '毛毛雨、细雨': 'drizzle',
  小到中雨: 'rain-light-medium',
  中到大雨: 'rain-medium-heavy',
  大到暴雨: 'rain-heavy-storm',
  暴雨到大暴雨: 'rain-storm-to-heavy',
  大暴雨到特大暴雨: 'rain-heavy-to-extreme',
  雨: 'rain',
  冻雨: 'freezing-rain',
  雨夹雪: 'sleet',
  雨雪天气: 'rain-snow',
  阵雪: 'snow-shower',
  阵雪_夜: 'snow-shower-night',
  小雪: 'snow-light',
  中雪: 'snow-medium',
  大雪: 'snow-heavy',
  暴雪: 'snow-storm',
  小到中雪: 'snow-light-medium',
  中到大雪: 'snow-medium-heavy',
  大到暴雪: 'snow-heavy-storm',
  阵雨夹雪: 'shower-sleet',
  阵雨夹雪_夜: 'shower-sleet-night',
  雪: 'snow',
  雾: 'fog',
  浓雾: 'fog-dense',
  强浓雾: 'fog-heavy',
  特强浓雾: 'fog-extreme',
  薄雾: 'fog-light',
  大雾: 'fog-thick',
  霾: 'haze',
  中度霾: 'haze-moderate',
  重度霾: 'haze-severe',
  严重霾: 'haze-critical',
  浮尘: 'dust',
  扬沙: 'sand',
  沙尘暴: 'sandstorm',
  强沙尘暴: 'sandstorm-heavy',
  龙卷风: 'tornado',
  台风: 'typhoon',
  热: 'hot',
  冷: 'cold',
  未知: 'unknown'
}

function parseFilename(filename) {
  const m = filename.match(/^name=(.+), style=Color-(Dark|Light)\.svg$/)
  if (!m) return null
  return { cn: m[1], theme: m[2].toLowerCase() }
}

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.svg'))
const renames = []
const missing = []

for (const file of files) {
  const parsed = parseFilename(file)
  if (!parsed) {
    console.warn('skip', file)
    continue
  }
  const slug = CN_TO_SLUG[parsed.cn]
  if (!slug) {
    missing.push(parsed.cn)
    continue
  }
  const target = `weather-${slug}-${parsed.theme}.svg`
  renames.push({ from: file, to: target, cn: parsed.cn, slug })
}

if (missing.length) {
  console.error('未映射的中文名:', [...new Set(missing)])
  process.exit(1)
}

// 两阶段重命名避免冲突
for (const { from, to } of renames) {
  fs.renameSync(path.join(dir, from), path.join(dir, `.tmp-${to}`))
}
for (const { to } of renames) {
  fs.renameSync(path.join(dir, `.tmp-${to}`), path.join(dir, to))
}

const slugs = [...new Set(renames.map((r) => r.slug))].sort()
fs.writeFileSync(
  path.resolve(__dirname, '../src/modules/weather/domain/weatherIconSlugs.json'),
  JSON.stringify(slugs, null, 2),
  'utf8'
)

console.log(`Renamed ${renames.length} files, ${slugs.length} unique slugs`)
