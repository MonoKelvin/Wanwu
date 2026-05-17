/**
 * 种子数据导入脚本
 * 用法: npm run seed:import
 */
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const seedPath = join(process.cwd(), 'assets', 'seed', 'sample-items.json')

if (!existsSync(seedPath)) {
  console.error('未找到', seedPath)
  process.exit(1)
}

const items = JSON.parse(readFileSync(seedPath, 'utf-8'))
console.log(`种子文件共 ${items.length} 条物品记录。`)
console.log('请在应用首次启动时自动导入，或于 Electron 主进程中调用 DatabaseService.seedIfEmpty()。')
