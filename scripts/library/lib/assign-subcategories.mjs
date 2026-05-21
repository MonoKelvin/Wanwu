import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { itemsRoot } from './items.mjs'

/** 功能型子类优先于 JSON 里遗留的地理子类 */
const FUNCTIONAL_SUBS = new Set([
  'dog-working',
  'dog-toy',
  'dog-hound',
  'cat-exotic',
  'cat-long-hair',
  'cat-short-hair',
  'plant-flowering',
  'plant-fern',
  'plant-succulent',
  'plant-aroid',
  'anime-shonen',
  'anime-fantasy',
  'anime-seinen',
  'anime-isekai',
  'anime-slice',
  'anime-ghibli',
  'moto-sport',
  'moto-adventure',
  'moto-germany',
  'tf-g1',
  'tf-autobot',
  'tf-decepticon',
  'tf-movie',
  'hero-marvel',
  'hero-dc',
  'hero-marvel-mcu',
  'hero-dc-film',
  'car-hypercar',
  'car-france',
  'int-nordic',
  'int-zen',
  'int-industrial',
  'int-modern',
  'id-appliance',
  'id-furniture',
  'hist-medieval',
  'hist-ancient',
  'movie-horror',
  'movie-classic',
  'movie-scifi'
])

/** @param {object} raw @param {string} categoryId */
function assignSubCategory(raw, categoryId) {
  const name = `${raw.name ?? ''} ${(raw.tags ?? []).join(' ')} ${raw.summary ?? ''} ${raw.description ?? ''}`
  const n = name.toLowerCase()

  if (categoryId === 'cat') {
    if (/无毛|卷毛|斯芬克斯|柯尼斯|塞尔凯克|德文|sphynx|devon|cornish|selkirk|laperm|rex|hairless/i.test(name))
      return 'cat-exotic'
    if (/缅因|波斯|布偶|挪威|长毛|ragdoll|maine|persian|angora/i.test(name)) return 'cat-long-hair'
    if (/短毛|暹罗|孟加拉|俄蓝|阿比|shorthair|siamese|bengal|russian/i.test(name)) return 'cat-short-hair'
    if (/中国|中华|狸花|橘猫|dragon-li|linqing/i.test(name)) return 'cat-china'
    if (/日本|日短|招福|北海道|冲绳|maneki|hokkaido|japanese/i.test(name)) return 'cat-japan'
    if (/美国|美洲|缅因美|savannah|pixiebob|ocicat|american/i.test(name)) return 'cat-americas'
    return 'cat-europe'
  }

  if (categoryId === 'dog') {
    if (
      /哈士奇|阿拉斯加|萨摩|德牧|德国牧羊|边境牧羊|牧羊|雪橇|獒|秋田|柴犬|杜宾|罗威|比利时|马犬|husky|malamute|shepherd|collie|samoyed|akita|doberman|rottweiler|mountain dog|cattle dog|jindo|tibetan/i.test(
        name
      )
    )
      return 'dog-working'
    if (
      /贵宾|泰迪|法斗|巴哥|吉娃娃|博美|约克夏|马尔济斯|骑士查理|蝴蝶|西施|北京犬|斗牛|柯基|pug|pekingese|shih|chihuahua|toy|miniature|boston|french bulldog|corgi|papillon|maltese|yorkshire/i.test(
        name
      )
    )
      return 'dog-toy'
    if (/比格|寻血|指示|灵缇|阿富汗|腊肠猎|beagle|hound|greyhound|setter|pointer|coonhound|ridgeback|dachshund/i.test(name))
      return 'dog-hound'
    if (/中国|中华|藏獒|沙皮|松狮|chinese|shar-pei|xolo|chow/i.test(name)) return 'dog-asia'
    if (/美国|美洲|比特|斯塔福|american|pit|staffordshire|catahoula|eskimo/i.test(name)) return 'dog-americas'
    return 'dog-europe'
  }

  if (categoryId === 'superhero') {
    if (/悟空|水手月亮|忍者神龟|柯南|goku|sailor moon|tmnt/i.test(name)) return 'hero-anime'
    if (/spawn|地狱男爵|无敌少侠|守望者|homelander|hellboy|invincible|kick-ass/i.test(name)) return 'hero-indie'
    if (/钢铁侠|美国队长|雷神|绿巨人|黑寡妇|奇异博士|漫威漫画|iron man|captain america|thor|hulk|marvel comics/i.test(n))
      return 'hero-marvel'
    if (/蝙蝠侠|超人|神奇女侠|闪电侠|海王|绿灯侠|小丑|dc漫画|batman|superman|wonder woman|flash|aquaman|dc comics/i.test(n))
      return 'hero-dc'
    if (/复仇者|蜘蛛侠|黑豹|银河护卫|marvel cinematic|mcu|spider-man|guardians/i.test(n)) return 'hero-marvel-mcu'
    if (/黑暗骑士|正义联盟|dceu|dark knight|justice league/i.test(n)) return 'hero-dc-film'
    return 'hero-other'
  }

  if (categoryId === 'supercar') {
    if (/布加迪|柯尼赛格|帕加尼|rimac|hypercar|bugatti|koenigsegg|pagani|veneno/i.test(name)) return 'car-hypercar'
    if (/法拉利|兰博基尼|玛莎拉蒂|ferrari|lamborghini|maserati/i.test(name)) return 'car-italy'
    if (/保时捷|奔驰|奥迪|宝马|porsche|mercedes|audi|bmw/i.test(name)) return 'car-germany'
    if (/迈凯伦|阿斯顿|宾利|劳斯莱斯|mclaren|aston|bentley|rolls/i.test(name)) return 'car-britain'
    if (/雪铁龙|雷诺|标致|alpine|citroen|renault|peugeot|bugatti france/i.test(name)) return 'car-france'
    return 'car-italy'
  }

  if (categoryId === 'anime') {
    if (/吉卜力|你的名字|哈尔|千与千寻|ghibli|your name|howl|totoro/i.test(name)) return 'anime-ghibli'
    if (/异世界|rezero|无职|overlord|isekai|mushoku/i.test(name)) return 'anime-isekai'
    if (/死亡笔记|命运石|怪物|青年|death note|steins|monster|seinen|psycho-pass/i.test(name)) return 'anime-seinen'
    if (/日常|间谍过家家|芙莉莲|治愈|slice|frieren|spy family|barakamon/i.test(name)) return 'anime-slice'
    if (/海贼王|火影|龙珠|死神|猎人|咒术|鬼灭|one piece|naruto|dragon ball|bleach|jujutsu|demon slayer/i.test(name))
      return 'anime-shonen'
    return 'anime-fantasy'
  }

  if (categoryId === 'transformers') {
    if (/g1|1984|经典玩具|generation one/i.test(name)) return 'tf-g1'
    if (/擎天柱|大黄蜂|爵士|铁皮|救护车|千斤顶|热破|钢索|汽车人|optimus|bumblebee|jazz|ratchet|ironhide|wheeljack|hot rod|ultra magnus|grimlock|autobot|arcee/i.test(name))
      return 'tf-autobot'
    if (/威震天|红蜘蛛|声波|震荡波|闹翻天|激光鸟|机器狗|霸天虎|megatron|starscream|soundwave|shockwave|decepticon|galvatron|ravage|laserbeak|brawl|devastator/i.test(name))
      return 'tf-decepticon'
    if (/电影版|变4|变5|live action|lockdown|barricade|blackout|电影系列|bayverse/i.test(name)) return 'tf-movie'
    return 'tf-g1'
  }

  if (categoryId === 'motorcycle') {
    if (/哈雷|印第安|harley|indian/i.test(name)) return 'moto-america'
    if (/杜卡迪|阿普利亚|MV|比亚乔|ducati|aprilia|agusta|guzzi/i.test(name)) return 'moto-italy'
    if (/本田|雅马哈|川崎|铃木|honda|yamaha|kawasaki|suzuki/i.test(name)) return 'moto-japan'
    if (/宝马|KTM|bmw r |bmw gs|ktm/i.test(name)) return 'moto-germany'
    if (/非洲双缸|探险|拉力|adventure|africa twin|versys|tiger 900|pan america/i.test(name)) return 'moto-adventure'
    if (/仿赛|R1|RS660|GSX|streetfighter|supersport|panigale|fireblade/i.test(name)) return 'moto-sport'
    return 'moto-japan'
  }

  if (categoryId === 'ui-design') {
    if (/figma|sketch|storybook|tailwind|bootstrap|ant design|chakra|radix|shadcn/i.test(name)) return 'ui-design-tool'
    if (/ios|android|watchos|material|human interface|fluent|one ui/i.test(name)) return 'ui-mobile'
    if (/stripe|notion|vercel|dashboard|glassmorphism|dark mode|app screen/i.test(name)) return 'ui-app-screen'
    return 'ui-web'
  }

  if (categoryId === 'illustration') {
    if (/蒙娜|维纳斯|伦勃朗|波提切利|呐喊|浮世绘|达芬奇|mona|venus|rembrandt|botticelli|munch|hokusai/i.test(name))
      return 'ill-classic'
    if (/肖像|立绘|vtuber|pixiv|portrait|anime girl/i.test(name)) return 'ill-portrait'
    if (/概念|场景|cyberpunk|concept art|blender|procreate/i.test(name)) return 'ill-concept'
    return 'ill-digital'
  }

  if (categoryId === 'industrial-design') {
    if (/椅|灯|eames|vitra|herman|muuto|家具|furniture|lamp|chair/i.test(name)) return 'id-furniture'
    if (/厨房|咖啡机|搅拌机|烤箱|kitchenaid|smeg|le creuset|nespresso|aeropress|appliance/i.test(name))
      return 'id-appliance'
    if (/沙发|家居|home product/i.test(name)) return 'id-home'
    if (/iphone|walkman|switch|playstation|kindle|dyson|roomba|hue|sony/i.test(name)) return 'id-product'
    return 'id-product'
  }

  if (categoryId === 'interior') {
    if (/禅|日式|和室|wabi|tatami|zen|japanese interior/i.test(name)) return 'int-zen'
    if (/北欧|瑞典|scandi|nordic|hygge|swedish cabin/i.test(name)) return 'int-nordic'
    if (/工业风|loft|砖墙|industrial interior/i.test(name)) return 'int-industrial'
    return 'int-modern'
  }

  if (categoryId === 'plant') {
    if (/多肉|仙人掌|succulent|cactus|lithops/i.test(name)) return 'plant-succulent'
    if (/龟背|绿萝|蔓绿绒|天南星|monstera|philodendron|pothos|aroid/i.test(name)) return 'plant-aroid'
    if (/蕨|苔藓|fern|moss|鹿角蕨|铁线蕨/i.test(name)) return 'plant-fern'
    if (/兰|玫瑰|开花|orchid|rose|flower|bloom/i.test(name)) return 'plant-flowering'
    return 'plant-aroid'
  }

  if (categoryId === 'movie') {
    if (/恐怖|惊悚|异形|闪灵|horror|alien|shining|psycho/i.test(name)) return 'movie-horror'
    if (/教父|卡萨布兰卡|公民凯恩|经典|godfather|casablanca|citizen/i.test(name)) return 'movie-classic'
    if (/星球大战|黑客帝国|银翼|盗梦|星际|sci-fi|star wars|matrix|blade runner|inception/i.test(name))
      return 'movie-scifi'
    return 'movie-action'
  }

  if (categoryId === 'history') {
    if (/长城|故宫|兵马俑|天坛|颐和园|forbidden|terracotta|great wall/i.test(name)) return 'hist-china'
    if (/金字塔|罗马|吴哥|佩特拉|巨石阵|pyramid|colosseum|machu|petra|angkor|stonehenge/i.test(name))
      return 'hist-ancient'
    if (/城堡|中世纪|凡尔赛|巴黎圣母院|castle|medieval|versailles|notre dame/i.test(name)) return 'hist-medieval'
    return 'hist-world'
  }

  const legacy = raw.subCategoryId
  if (legacy && FUNCTIONAL_SUBS.has(legacy)) return legacy
  return legacy
}

/** @param {string} root */
export function assignSubcategories(root) {
  const idir = itemsRoot(root)
  let updated = 0
  for (const categoryId of readdirSync(idir)) {
    const categoryDir = join(idir, categoryId)
    if (!existsSync(categoryDir) || categoryId.startsWith('_')) continue
    for (const file of readdirSync(categoryDir).filter((f) => f.endsWith('.json') && !f.startsWith('_'))) {
      const p = join(categoryDir, file)
      const raw = JSON.parse(readFileSync(p, 'utf-8'))
      const next = assignSubCategory(raw, categoryId)
      if (next && next !== raw.subCategoryId) {
        raw.subCategoryId = next
        writeFileSync(p, JSON.stringify(raw, null, 2) + '\n', 'utf-8')
        updated++
      }
    }
  }
  console.log(`二级分类已更新 ${updated} 条`)
}
