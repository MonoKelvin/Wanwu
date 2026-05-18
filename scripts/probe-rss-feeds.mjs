import Parser from 'rss-parser'

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'Wanwu/1.0 (Desktop; +https://github.com/MonoKelvin/Wanwu)' }
})

const candidates = [
  ['NASA APOD', 'https://apod.nasa.gov/apod.rss'],
  ['TED Video', 'https://feeds.feedburner.com/TEDTalks_video'],
  ['ANN', 'https://www.animenewsnetwork.com/news/rss.xml'],
  ['豆瓣读书', 'https://book.douban.com/feed/latest'],
  ['简书', 'https://www.jianshu.com/rss'],
  ['新浪图片', 'https://rss.sina.com.cn/photo/slide_photo.xml'],
  ['什么值得买', 'https://feed.smzdm.com'],
  ['Unsplash', 'https://unsplash.com/feed.xml'],
  ['煎蛋', 'https://jandan.net/feed'],
  ['Solidot', 'https://www.solidot.org/index.rss'],
  ['Linux.cn', 'https://linux.cn/rss.xml'],
  ['阮一峰', 'https://www.ruanyifeng.com/blog/atom.xml'],
  ['NYT Science', 'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml'],
  ['PetaPixel', 'https://petapixel.com/feed/'],
  ['Colossal art', 'https://www.thisiscolossal.com/feed/'],
  ['Kotaku', 'https://kotaku.com/rss'],
  ['Engadget', 'https://www.engadget.com/rss.xml'],
  ['豆瓣电影', 'https://movie.douban.com/feed/new_movie'],
  ['机核', 'https://www.gcores.com/rss/home'],
  ['虎嗅', 'https://www.huxiu.com/rss/0.xml'],
  ['BBC News', 'https://feeds.bbci.co.uk/news/rss.xml'],
  ['Reddit pics', 'https://www.reddit.com/r/pics/.rss'],
  ['National Geographic', 'https://feeds.nationalgeographic.com/ng/photography'],
  ['Wired', 'https://www.wired.com/feed/rss'],
  ['少数派', 'https://sspai.com/feed'],
  ['IT之家', 'https://www.ithome.com/rss/'],
  ['开源中国', 'https://www.oschina.net/news/rss'],
  ['爱范儿', 'https://www.ifanr.com/feed'],
  ['量子位', 'https://www.qbitai.com/feed'],
  ['美团技术', 'https://tech.meituan.com/feed/'],
  ['张鑫旭', 'https://www.zhangxinxu.com/wordpress/feed/'],
  ['酷壳', 'https://coolshell.cn/feed'],
  ['异次元', 'https://www.iplaysoft.com/feed'],
  ['廖雪峰', 'https://www.liaoxuefeng.com/feed.xml'],
  ['谢益辉', 'https://yihui.org/cn/index.xml'],
  ['抽屉', 'https://dig.chouti.com/rss.xml'],
  ['新浪科技', 'https://rss.sina.com.cn/tech/rollnews.xml'],
  ['B站每周必看', 'https://rsshub.app/bilibili/weekly/0'],
  ['豆瓣影评', 'https://www.douban.com/feed/movie/reviews.rss'],
  ['知乎日报', 'https://www.zhihu.com/rss'],
  ['果壳', 'https://www.guokr.com/rss/'],
  ['品玩', 'https://www.pingwest.com/feed']
]

async function probe(name, url) {
  try {
    const p = await parser.parseURL(url)
    const items = p.items?.length ?? 0
    const hasImg = p.items?.some((it) => {
      const c = it.content || it.summary || ''
      return (
        it.enclosure?.url ||
        /<img/i.test(c) ||
        it['media:thumbnail'] ||
        it['media:content']
      )
    })
    const ok = items > 0 || Boolean(p.title)
    console.log(`${ok ? 'OK' : 'FAIL'}\t${items}\timg:${hasImg ? 'Y' : 'n'}\t${name}\t${url}`)
    return ok
  } catch (e) {
    console.log(`ERR\t0\timg:n\t${name}\t${e.message?.slice(0, 60)}`)
    return false
  }
}

for (const [name, url] of candidates) {
  await probe(name, url)
}
