/**
 * 「狗」大类 Pixabay 搜索词
 */
export const DOG_MEDIA_QUERIES = {
  'dog-border-collie': { query: 'border collie dog', matchTags: ['dog', 'border', 'collie'] },
  'dog-golden-retriever': { query: 'golden retriever dog', matchTags: ['dog', 'golden', 'retriever'] },
  'dog-shiba-inu': { query: 'shiba inu dog', matchTags: ['dog', 'shiba'] },
  'dog-corgi': { query: 'pembroke welsh corgi dog', matchTags: ['dog', 'corgi'] },
  'dog-german-shepherd': { query: 'german shepherd dog', matchTags: ['dog', 'shepherd'] },
  'dog-french-bulldog': { query: 'french bulldog dog', matchTags: ['dog', 'bulldog'] },
  'dog-english-bulldog': { query: 'english bulldog dog', matchTags: ['dog', 'bulldog'] },
  'dog-rottweiler': { query: 'rottweiler dog', matchTags: ['dog', 'rottweiler'] },
  'dog-doberman': { query: 'doberman pinscher dog', matchTags: ['dog', 'doberman'] },
  'dog-boxer': { query: 'boxer dog portrait', matchTags: ['dog', 'boxer'] },
  'dog-dalmatian': { query: 'dalmatian dog spots', matchTags: ['dog', 'dalmatian'] },
  'dog-great-dane': { query: 'great dane dog', matchTags: ['dog', 'dane'] },
  'dog-cocker-spaniel': { query: 'cocker spaniel dog', matchTags: ['dog', 'spaniel'] },
  'dog-poodle': { query: 'poodle dog', matchTags: ['dog', 'poodle'] },
  'dog-beagle': { query: 'beagle dog', matchTags: ['dog', 'beagle'] },
  'dog-shetland-sheepdog': { query: 'shetland sheepdog dog', matchTags: ['dog', 'sheltie'] },
  'dog-cardigan-corgi': { query: 'cardigan welsh corgi dog', matchTags: ['dog', 'corgi'] },
  'dog-scottish-terrier': { query: 'scottish terrier dog', matchTags: ['dog', 'terrier'] },
  'dog-bernese-mountain': { query: 'bernese mountain dog', matchTags: ['dog', 'bernese'] },
  'dog-greyhound': { query: 'greyhound dog running', matchTags: ['dog', 'greyhound'] },
  'dog-saint-bernard': { query: 'saint bernard dog', matchTags: ['dog', 'bernard'] },
  'dog-irish-setter': { query: 'irish setter dog red', matchTags: ['dog', 'setter'] },
  'dog-labrador-retriever': { query: 'labrador retriever dog', matchTags: ['dog', 'labrador'] },
  'dog-australian-shepherd': { query: 'australian shepherd dog', matchTags: ['dog', 'australian'] },
  'dog-australian-cattle-dog': { query: 'australian cattle dog', matchTags: ['dog', 'cattle'] },
  'dog-boston-terrier': { query: 'boston terrier dog', matchTags: ['dog', 'boston'] },
  'dog-american-pit-bull': { query: 'pit bull terrier dog', matchTags: ['dog', 'pitbull'] },
  'dog-alaskan-malamute': { query: 'alaskan malamute dog', matchTags: ['dog', 'malamute'] },
  'dog-chesapeake-bay-retriever': { query: 'chesapeake bay retriever dog', matchTags: ['dog', 'retriever'] },
  'dog-american-staffordshire': { query: 'staffordshire terrier dog', matchTags: ['dog', 'staffordshire'] },
  'dog-nova-scotia-tolling': { query: 'nova scotia duck tolling retriever', matchTags: ['dog', 'retriever'] },
  'dog-american-eskimo': { query: 'american eskimo dog white', matchTags: ['dog', 'eskimo'] },
  'dog-catahoula-leopard': { query: 'catahoula leopard dog', matchTags: ['dog', 'catahoula'] },
  'dog-xoloitzcuintli': { query: 'xoloitzcuintli hairless dog', matchTags: ['dog', 'xolo'] },
  'dog-vizsla': { query: 'vizsla dog', matchTags: ['dog', 'vizsla'] },
  'dog-samoyed': { query: 'samoyed dog white', matchTags: ['dog', 'samoyed'] },
  'dog-akita': { query: 'akita inu dog', matchTags: ['dog', 'akita'] },
  'dog-chow-chow': { query: 'chow chow dog', matchTags: ['dog', 'chow'] },
  'dog-shar-pei': { query: 'shar pei dog', matchTags: ['dog', 'shar'] },
  'dog-pekingese': { query: 'pekingese dog', matchTags: ['dog', 'pekingese'] },
  'dog-shih-tzu': { query: 'shih tzu dog', matchTags: ['dog', 'shih'] },
  'dog-tibetan-mastiff': { query: 'tibetan mastiff dog', matchTags: ['dog', 'mastiff'] },
  'dog-korean-jindo': { query: 'korean jindo dog', matchTags: ['dog', 'jindo'] },
  'dog-siberian-husky': { query: 'siberian husky dog', matchTags: ['dog', 'husky'] },
  'dog-hokkaido': { query: 'hokkaido dog japan', matchTags: ['dog', 'japan'] },
  'dog-chinese-crested': { query: 'chinese crested dog', matchTags: ['dog', 'crested'] },
  'dog-pug': { query: 'pug dog portrait', matchTags: ['dog', 'pug'] },
  'dog-thai-ridgeback': { query: 'thai ridgeback dog', matchTags: ['dog', 'ridgeback'] },
  'dog-formosan-mountain': { query: 'taiwan dog mountain', matchTags: ['dog', 'taiwan'] },
  'dog-miniature-schnauzer': { query: 'miniature schnauzer dog', matchTags: ['dog', 'schnauzer'] }
}

export function dogMediaManifestEntries() {
  const base = { category: 'animals', provider: 'pixabay', requiredTags: ['dog'] }
  return Object.fromEntries(
    Object.entries(DOG_MEDIA_QUERIES).map(([slug, cfg]) => [
      slug,
      { ...base, query: cfg.query, matchTags: cfg.matchTags }
    ])
  )
}
