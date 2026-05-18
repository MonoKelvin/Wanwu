/**
 * @deprecated 易图文不符，请用 media.json + npm run seed:library:media（Pixabay）
 * 精选 Unsplash 图片 ID（legacy-unsplash 脚本专用）
 */
function u(id) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=85&fm=jpg`
}

export const UNSPLASH_CURATED = {
  'cat-british-shorthair': [
    u('photo-1574158622682-e40e69881006'),
    u('photo-1514888286974-6c03e2ca1dba'),
    u('photo-1495360010541-f8884a036d81'),
    u('photo-1529778860033-28cda963f329')
  ],
  'cat-ragdoll': [
    u('photo-1595433707802-6b2626ef1c91'),
    u('photo-1573865526739-10659fec78a5'),
    u('photo-1513245543132-31f5074bd63d'),
    u('photo-1571566882370-123d3747b5a0')
  ],
  'cat-maine-coon': [
    u('photo-1533731095061-aa32d977eaa0'),
    u('photo-1518791841217-8f162f1e1131'),
    u('photo-1543852786-1cf6624b9987'),
    u('photo-1511043497918-9875030f927c')
  ],
  'dog-golden-retriever': [
    u('photo-1633722718619-0b4c64f66111'),
    u('photo-1552053831-71594a276aea'),
    u('photo-1587300003388-59208cc962cb'),
    u('photo-1530281700549-e82e3b65a053')
  ],
  'dog-border-collie': [
    u('photo-1507146420286-3439e3f0b9a0'),
    u('photo-1568393691622-962540836551'),
    u('photo-1583511655857-d19b40a0a4a1'),
    u('photo-1551717743-49959800b1d6')
  ],
  'dog-shiba-inu': [
    u('photo-1543465077-78997da6c510'),
    u('photo-1583337130417-3346a1be7dee'),
    u('photo-1615233425242-ffc4e4e5b7cc'),
    u('photo-1568393691622-962540836551')
  ],
  'supercar-ferrari-488': [
    u('photo-1583121274602-3ec288ff8953'),
    u('photo-1492144534655-ae79c964c10d'),
    u('photo-1503376780353-7e6692767b70'),
    u('photo-1614200174756-338bc577fccb')
  ],
  'supercar-lamborghini-huracan': [
    u('photo-1544636331-e26879cd4d9b'),
    u('photo-1618843479313-40f8afb4b4d8'),
    u('photo-1614162692292-7c4a605a5746'),
    u('photo-1580273916550-e323be2ae537')
  ],
  'supercar-porsche-911': [
    u('photo-1503376780353-7e6692767b70'),
    u('photo-1617814076367-b759e798a83e'),
    u('photo-1614200174756-338bc577fccb'),
    u('photo-1583121274602-3ec288ff8953')
  ],
  'plant-monstera': [
    u('photo-1614594806638-1c7a1b0b0e0e'),
    u('photo-1593485074753-ea8c5f65e2e2'),
    u('photo-1466781783364-36c955e42a7f'),
    u('photo-1485955900006-10f4d324d4bf')
  ],
  'plant-fiddle-leaf-fig': [
    u('photo-1593485074753-ea8c5f65e2e2'),
    u('photo-1416879595882-3373a0480b5b'),
    u('photo-1463320890704-df7c9a7c2c0e'),
    u('photo-1459411552884-841fb9b2042a')
  ],
  'plant-echeveria': [
    u('photo-1459411552884-841fb9b2042a'),
    u('photo-1509937528035-ad0c0e0f2b0b'),
    u('photo-1509423353726-4f3f0a2f0f0b'),
    u('photo-1416879595882-3373a0480b5b')
  ],
  'movie-inception': [
    u('photo-1480714378409-67e9d8a49d36'),
    u('photo-1449824913935-59a10b8d2001'),
    u('photo-1514565131-fce0801e5785'),
    u('photo-1477959852107-04265acd29b2')
  ],
  'movie-spirited-away': [
    u('photo-1578632767115-351597cf2477'),
    u('photo-1613376023733-b31bd0d1a132'),
    u('photo-1558618666-fcd25c85cd64'),
    u('photo-1490750967868-88ea4486e783')
  ],
  'movie-the-dark-knight': [
    u('photo-1514565131-fce0801e5785'),
    u('photo-1477959852107-04265acd29b2'),
    u('photo-1480714378409-67e9d8a49d36'),
    u('photo-1444723128167-4926a4c0c0b0')
  ],
  'anime-one-piece': [
    u('photo-1495954746962-46a8c4e6c6b1'),
    u('photo-1559827260-dc66d52bef19'),
    u('photo-1507525428034-b723cf961d3e'),
    u('photo-1476514525535-07fb3d4f5b3e')
  ],
  'anime-demon-slayer': [
    u('photo-1578632767115-351597cf2477'),
    u('photo-1612036786305-5fe2a08884c0'),
    u('photo-1540959733332-eab4deabeeaf'),
    u('photo-1579783902617-a3fb39279b1a')
  ],
  'anime-attack-on-titan': [
    u('photo-1506905925346-21bda4d32df4'),
    u('photo-1464822759023-fed622ff2c3b'),
    u('photo-1454496524508-7b9f8a139b1c'),
    u('photo-1439853946567-4fac6639470f')
  ],
  'motorcycle-ducati-panigale': [
    u('photo-1558981403-c5f9899a28bc'),
    u('photo-1568772585407-9361f9bf3a87'),
    u('photo-1609630875171-b1321377ee65'),
    u('photo-1619642751034-765f983a38f8')
  ],
  'motorcycle-harley-street': [
    u('photo-1609630875171-b1321377ee65'),
    u('photo-1558981403-c5f9899a28bc'),
    u('photo-1619642751034-765f983a38f8'),
    u('photo-1568772585407-9361f9bf3a87')
  ],
  'illustration-vocaloid-miku': [
    u('photo-1578632767115-351597cf2477'),
    u('photo-1612036786305-5fe2a08884c0'),
    u('photo-1540959733332-eab4deabeeaf'),
    u('photo-1493225457124-a3eb161ffa5f')
  ],
  'illustration-girl-with-pearl-earring': [
    u('photo-1578301978018-3006ddbc4f83'),
    u('photo-1579783902617-a3fb39279b1a'),
    u('photo-1549887534-1541e9326642'),
    u('photo-1515405295578-287ca43a495c')
  ],
  'ui-material-design-3': [
    u('photo-1511707171634-5f897ff02aa9'),
    u('photo-1556656793-08538906a9f8'),
    u('photo-1592890288564-28b48f2f7f0a'),
    u('photo-1526498460530-4c593a5a3a0a')
  ],
  'ui-ios-human-interface': [
    u('photo-1592890288564-28b48f2f7f0a'),
    u('photo-1511707171634-5f897ff02aa9'),
    u('photo-1556656793-08538906a9f8'),
    u('photo-1526498460530-4c593a5a3a0a')
  ],
  'interior-scandinavian-living': [
    u('photo-1616486338812-3dadae4b4ace'),
    u('photo-1586023492125-27b2c045efd7'),
    u('photo-1618221193240-24ec432baf92'),
    u('photo-1615529328331-f8917597711f')
  ],
  'interior-japanese-zen': [
    u('photo-1615529328331-f8917597711f'),
    u('photo-1586023492125-27b2c045efd7'),
    u('photo-1616486338812-3dadae4b4ace'),
    u('photo-1618221193240-24ec432baf92')
  ],
  'industrial-alessi-kettle': [
    u('photo-1556909114-f6e7ad7d4046'),
    u('photo-1556911220-bff31c812dba'),
    u('photo-1556909114-44e3e70034f2'),
    u('photo-1585515320310-259814833e2f')
  ],
  'industrial-dyson-v15': [
    u('photo-1558618666-fcd25c85cd64'),
    u('photo-1585515320310-259814833e2f'),
    u('photo-1556909114-f6e7ad7d4046'),
    u('photo-1556911220-bff31c812dba')
  ],
  'transformers-optimus-prime': [
    u('photo-1552519507-da3b142c6e3d'),
    u('photo-1492144534655-ae79c964c10d'),
    u('photo-1583121274602-3ec288ff8953'),
    u('photo-1503376780353-7e6692767b70')
  ],
  'transformers-bumblebee': [
    u('photo-1492144534655-ae79c964c10d'),
    u('photo-1614200174756-338bc577fccb'),
    u('photo-1503376780353-7e6692767b70'),
    u('photo-1552519507-da3b142c6e3d')
  ],
  'superhero-spiderman': [
    u('photo-1635805737707-575885ab0820'),
    u('photo-1635266069547-006b5f760f4b'),
    u('photo-1531259683007-016a7b628fc3'),
    u('photo-1612036786305-5fe2a08884c0')
  ],
  'superhero-batman-tas': [
    u('photo-1477959852107-04265acd29b2'),
    u('photo-1514565131-fce0801e5785'),
    u('photo-1444723128167-4926a4c0c0b0'),
    u('photo-1480714378409-67e9d8a49d36')
  ],
  'history-terracotta-army': [
    u('photo-1545569341-9ebcd7a6239b'),
    u('photo-1528162053270-7d93bf3272a5'),
    u('photo-1508804185879-d7badad00f7e'),
    u('photo-1547981609-4d9d0f2e0a0a')
  ],
  'history-great-wall': [
    u('photo-1508804185879-d7badad00f7e'),
    u('photo-1528162053270-7d93bf3272a5'),
    u('photo-1545569341-9ebcd7a6239b'),
    u('photo-1470071459604-3b5ec3a7fe05')
  ]
}
