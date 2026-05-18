import Parser from 'rss-parser'

const parser = new Parser({
  timeout: 12000,
  headers: { 'User-Agent': 'Wanwu/1.0 (Desktop; +https://github.com/MonoKelvin/Wanwu)' }
})

const candidates = [
  ['知乎热榜', 'https://rsshub.rssforever.com/zhihu/hotlist'],
  ['B站综合热门', 'https://rsshub.rssforever.com/bilibili/popular/all'],
  ['豆瓣最受欢迎', 'https://rsshub.rssforever.com/douban/movie/playing'],
  ['煎蛋', 'https://rsshub.rssforever.com/jandan/top'],
  ['NHK', 'https://www3.nhk.or.jp/rss/news/cat0.xml'],
  ['小众软件', 'https://feeds.appinn.com/appinn'],
  ['威锋', 'https://www.feng.com/forum/portal.php?mod=rss'],
  ['机核', 'https://www.gcores.com/rss/home.xml'],
  ['数字尾巴', 'https://www.dgtle.com/rss.xml'],
  ['雷锋网', 'https://www.leiphone.com/feed'],
  ['cnBeta', 'https://www.cnbeta.com/backend.php'],
  ['虎嗅', 'https://rss.huxiu.com/'],
  ['V2EX', 'https://www.v2ex.com/index.xml'],
  ['Linux中国', 'https://linux.cn/feed.rss'],
  ['美团', 'https://tech.meituan.com/feed/'],
  ['阮一峰', 'https://www.ruanyifeng.com/blog/atom.xml'],
  ['HelloGitHub', 'https://hellogithub.com/rss'],
  ['掘金', 'https://juejin.cn/rss'],
  ['Pixiv日榜', 'https://rsshub.rssforever.com/pixiv/ranking/day'],
  ['Bangumi', 'https://rsshub.rssforever.com/bangumi.tv/topic/cosplay'],
  ['Smzdm', 'https://rss.smzdm.com'],
  ['新浪娱乐', 'https://rss.sina.com.cn/ent/ent_focus.xml'],
  ['Mtime', 'https://news.mtime.com/rss/movie.xml'],
  ['AcFun', 'https://rsshub.rssforever.com/acfun/article'],
  ['豆瓣读书', 'https://rsshub.rssforever.com/douban/book/fiction'],
  ['NASA', 'https://apod.nasa.gov/apod.rss'],
  ['PetaPixel', 'https://petapixel.com/feed/'],
  ['Colossal', 'https://www.thisiscolossal.com/feed/'],
  ['Engadget', 'https://www.engadget.com/rss.xml'],
  ['Wired', 'https://www.wired.com/feed/rss'],
  ['Solidot', 'https://www.solidot.org/index.rss'],
  ['煎蛋官网', 'https://jandan.net/feed']
]

async function probe(name, url) {
  try {
    const p = await parser.parseURL(url)
    const items = p.items?.length ?? 0
    const ok = items > 0
    console.log(`${ok ? 'OK' : 'FAIL'}\t${items}\t${name}\t${url}`)
  } catch (e) {
    console.log(`ERR\t0\t${name}\t${String(e.message).slice(0, 70)}`)
  }
}

for (const [name, url] of candidates) {
  await probe(name, url)
}
