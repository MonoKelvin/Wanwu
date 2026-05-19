import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { itemsRoot } from './items.mjs'

/** @param {object} raw @param {string} categoryId */
function assignSubCategory(raw, categoryId) {
  const name = `${raw.name ?? ''} ${(raw.tags ?? []).join(' ')} ${raw.summary ?? ''}`
  const n = name.toLowerCase()

  if (categoryId === 'cat') {
    if (/sphynx|devon|cornish|selkirk|laperm|rex|hairless/i.test(name)) return 'cat-exotic'
    if (/maine|persian|ragdoll|norwegian|angora|van|longhair|bobtail-longhair/i.test(name)) return 'cat-long-hair'
    if (/shorthair|siamese|bengal|russian|chartreux|american shorthair/i.test(name)) return 'cat-short-hair'
    if (/china|chinese|dragon-li|linqing|calico-chinese|jianzhou|cow-cat/i.test(name)) return 'cat-china'
    if (/japan|japanese|maneki|hokkaido|okinawa|bobtail/i.test(name)) return 'cat-japan'
    if (/america|american|savannah|pixiebob|ocicat/i.test(name)) return 'cat-americas'
    return raw.subCategoryId?.startsWith('cat-') ? raw.subCategoryId : 'cat-europe'
  }

  if (categoryId === 'dog') {
    if (/husky|malamute|shepherd|collie|cattle|mountain|jindo|hokkaido|formosan|tibetan/i.test(name))
      return 'dog-working'
    if (/pug|pekingese|shih|chihuahua|toy|miniature|boston|french bulldog|corgi/i.test(name))
      return 'dog-toy'
    if (/beagle|hound|greyhound|setter|pointer|coonhound|ridgeback/i.test(name)) return 'dog-hound'
    if (/china|chinese|shar-pei|xolo/i.test(name)) return 'dog-asia'
    if (/america|american|pit|staffordshire|catahoula|eskimo/i.test(name)) return 'dog-americas'
    return raw.subCategoryId?.startsWith('dog-') ? raw.subCategoryId : 'dog-europe'
  }

  if (categoryId === 'superhero') {
    if (/goku|sailor moon|witcher|leonardo|tmnt|conan/i.test(n)) return 'hero-anime'
    if (/spawn|hellboy|invincible|kick-ass|boys|homelander|watchmen/i.test(n)) return 'hero-indie'
    if (
      /iron man|captain america|thor|hulk|widow|panther|strange|ant-man|guardian|marvel|scarlet|silver surfer/i.test(
        n
      )
    )
      return 'hero-marvel-mcu'
    if (
      /batman|superman|wonder woman|flash|aquaman|cyborg|lantern|harley|joker|nightwing|raven|shazam|constantine|martian/i.test(
        n
      )
    )
      return 'hero-dc-film'
    if (raw.subCategoryId === 'hero-dc') return 'hero-dc-film'
    if (raw.subCategoryId === 'hero-marvel') return 'hero-marvel-mcu'
    return 'hero-other'
  }

  if (categoryId === 'supercar') {
    if (/bugatti|koenigsegg|pagani|rimac|evija|veneno/i.test(n)) return 'car-hypercar'
    if (/ferrari|lamborghini|maserati|pagani/i.test(n)) return 'car-italy'
    if (/porsche|mercedes|audi|bmw|volkswagen/i.test(n)) return 'car-germany'
    if (/mclaren|aston|lotus|jaguar|bentley|rolls/i.test(n)) return 'car-britain'
    if (/bugatti|citroen|renault|peugeot/i.test(n)) return 'car-france'
    return raw.subCategoryId ?? 'car-italy'
  }

  if (categoryId === 'anime') {
    if (/ghibli|your name|howl|violet evergarden/i.test(n)) return 'anime-ghibli'
    if (/rezero|mushoku|sword art|overlord|isekai/i.test(n)) return 'anime-isekai'
    if (/death note|steins|psycho|monster|seinen/i.test(n)) return 'anime-seinen'
    if (/spy|slice|frieren|barakamon/i.test(n)) return 'anime-slice'
    if (/one piece|naruto|dragon ball|bleach|hunter|hero academia|jujutsu|demon slayer/i.test(n))
      return 'anime-shonen'
    return raw.subCategoryId ?? 'anime-fantasy'
  }

  if (categoryId === 'transformers') {
    if (/movie|lockdown|blackout|barricade/i.test(n)) return 'tf-movie'
    if (
      /megatron|starscream|soundwave|shockwave|barricade|blackout|brawl|devastator|galvatron|lockdown|ravage|laserbeak/i.test(
        n
      )
    )
      return 'tf-decepticon'
    if (/optimus|bumblebee|jazz|ratchet|ironhide|arcee|wheeljack|hot rod|ultra magnus|grimlock/i.test(n))
      return 'tf-autobot'
    return raw.subCategoryId ?? 'tf-g1'
  }

  if (categoryId === 'motorcycle') {
    if (/harley|indian|challenger|scout/i.test(n)) return 'moto-america'
    if (/ducati|aprilia|mv agusta|bimota|moto guzzi/i.test(n)) return 'moto-italy'
    if (/honda|yamaha|kawasaki|suzuki/i.test(n)) return 'moto-japan'
    if (/bmw|ktm/i.test(n)) return 'moto-germany'
    if (/africa twin|tracer|versys|adventure|pan america/i.test(n)) return 'moto-adventure'
    if (/r1|rs660|gsx|supersport|streetfighter|sportster/i.test(n)) return 'moto-sport'
    return raw.subCategoryId ?? 'moto-japan'
  }

  if (categoryId === 'ui-design') {
    if (/figma|sketch|storybook|design system|tailwind|bootstrap|ant design|chakra|radix|shadcn/i.test(n))
      return 'ui-design-tool'
    if (/ios|android|watchos|one ui|material|human interface|fluent/i.test(n)) return 'ui-mobile'
    if (/stripe|notion|vercel|dashboard|glassmorphism|dark mode/i.test(n)) return 'ui-app-screen'
    return raw.subCategoryId ?? 'ui-web'
  }

  if (categoryId === 'illustration') {
    if (/mona|venus|rembrandt|botticelli|munch|hokusai|caravaggio|renoir|da vinci|pearl/i.test(n))
      return 'ill-classic'
    if (/portrait|anime|vtuber|light novel|pixiv/i.test(n)) return 'ill-portrait'
    if (/cyberpunk|city|concept|game ui|blender|procreate/i.test(n)) return 'ill-concept'
    return 'ill-digital'
  }

  if (categoryId === 'industrial-design') {
    if (/chair|lamp|eames|vitra|herman|muuto|kitchenaid|smeg|le creuset|aeropress|nespresso/i.test(n))
      return 'id-home'
    if (/iphone|walkman|switch|playstation|kindle|dyson|roomba|hue/i.test(n)) return 'id-product'
    return raw.subCategoryId ?? 'id-product'
  }

  if (categoryId === 'interior') {
    if (/zen|japanese|wabi|tatami/i.test(n)) return 'int-zen'
    if (/scandi|nordic|swedish/i.test(n)) return 'int-nordic'
    if (/industrial|loft|brick/i.test(n)) return 'int-industrial'
    return 'int-modern'
  }

  if (categoryId === 'plant') {
    if (/succulent|cactus|aloe/i.test(n)) return 'plant-succulent'
    if (/monstera|philodendron|pothos|aroid/i.test(n)) return 'plant-aroid'
    if (/orchid|rose|flower/i.test(n)) return 'plant-flowering'
    return raw.subCategoryId ?? 'plant-aroid'
  }

  if (categoryId === 'movie') {
    if (/horror|alien|shining|psycho/i.test(n)) return 'movie-horror'
    if (/godfather|casablanca|citizen/i.test(n)) return 'movie-classic'
    if (/star wars|matrix|blade runner|inception|interstellar/i.test(n)) return 'movie-scifi'
    return raw.subCategoryId ?? 'movie-action'
  }

  if (categoryId === 'history') {
    if (/great wall|forbidden|terracotta|temple of heaven/i.test(n)) return 'hist-china'
    if (/pyramid|colosseum|machu|petra|angkor|stonehenge/i.test(n)) return 'hist-ancient'
    if (/castle|medieval|notre|versailles/i.test(n)) return 'hist-medieval'
    return raw.subCategoryId ?? 'hist-world'
  }

  return raw.subCategoryId
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
