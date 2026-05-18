/**
 * 提示：全库图鉴请使用 npm run seed:library
 */
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const catalog = join(process.cwd(), 'assets', 'seed', 'library', 'catalog.json')
if (existsSync(catalog)) {
  const data = JSON.parse(readFileSync(catalog, 'utf-8')) as { items: unknown[] }
  console.log(`全库目录已就绪：${data.items.length} 条（catalog.json）`)
  console.log('下载配图: 配置 PIXABAY_API_KEY 后 npm run seed:library:media -- --force')
  console.log('导入数据库: npm run seed:library:reimport 或重启应用')
} else {
  console.log('未找到 catalog.json，请先运行: npm run seed:library:placeholders')
}
