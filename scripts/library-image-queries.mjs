/** slug → 英文搜索词（Unsplash / Pixabay 全库配图共用） */
export const LIBRARY_IMAGE_QUERIES = {
  'cat-british-shorthair': 'british shorthair cat',
  'cat-ragdoll': 'ragdoll cat blue eyes',
  'cat-maine-coon': 'maine coon cat',
  'dog-golden-retriever': 'golden retriever dog',
  'dog-border-collie': 'border collie dog',
  'dog-shiba-inu': 'shiba inu dog',
  'supercar-ferrari-488': 'ferrari sports car red',
  'supercar-lamborghini-huracan': 'lamborghini huracan supercar',
  'supercar-porsche-911': 'porsche 911 sports car',
  'plant-monstera': 'monstera deliciosa plant indoor',
  'plant-fiddle-leaf-fig': 'fiddle leaf fig plant',
  'plant-echeveria': 'echeveria succulent plant',
  'movie-inception': 'surreal architecture city dream',
  'movie-spirited-away': 'japanese animation fantasy spirit',
  'movie-the-dark-knight': 'dark city night urban gothic',
  'anime-one-piece': 'pirate ship ocean adventure',
  'anime-demon-slayer': 'japanese sword samurai forest',
  'anime-attack-on-titan': 'medieval wall fortress dramatic sky',
  'motorcycle-ducati-panigale': 'ducati sport motorcycle',
  'motorcycle-harley-street': 'harley davidson cruiser motorcycle',
  'illustration-vocaloid-miku': 'concert stage lights turquoise',
  'illustration-girl-with-pearl-earring': 'portrait painting woman pearl',
  'ui-material-design-3': 'android smartphone material design ui',
  'ui-ios-human-interface': 'iphone smartphone minimal white',
  'interior-scandinavian-living': 'scandinavian living room interior',
  'interior-japanese-zen': 'japanese tatami room interior zen',
  'industrial-alessi-kettle': 'designer kettle kitchen product',
  'industrial-dyson-v15': 'modern vacuum cleaner product',
  'transformers-optimus-prime': 'truck vehicle',
  'transformers-bumblebee': 'yellow sports car',
  'superhero-spiderman': 'spiderman superhero cosplay',
  'superhero-batman-tas': 'gotham city night skyline dark',
  'history-terracotta-army': 'terracotta warriors china',
  'history-great-wall': 'great wall of china'
}

export function librarySearchQuery(item) {
  if (LIBRARY_IMAGE_QUERIES[item.slug]) return LIBRARY_IMAGE_QUERIES[item.slug]
  const tail = item.slug.replace(/^[^-]+-/, '').replace(/-/g, ' ')
  return `${tail} ${item.tags?.[0] ?? ''}`.trim()
}
