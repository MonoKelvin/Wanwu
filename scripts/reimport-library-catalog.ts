/**
 * 将 catalog.json 重新导入各 library_*.sqlite（无需启动 Electron UI）
 * 用法: npm run seed:library:reimport
 */
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { DatabaseService } from '../electron/services/database'
import { importLibraryCatalog } from '../electron/services/librarySeed'

function resolveUserData(): string {
  if (process.env.WANWU_USER_DATA) return process.env.WANWU_USER_DATA
  const appName = 'wanwu'
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming')
    return join(appData, appName)
  }
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', appName)
  }
  return join(homedir(), '.config', appName)
}

async function main() {
  const userData = resolveUserData()
  mkdirSync(join(userData, 'db'), { recursive: true })

  if (!existsSync(join(process.cwd(), 'assets', 'seed', 'library', 'catalog.json'))) {
    console.error('未找到 assets/seed/library/catalog.json')
    process.exit(1)
  }

  const db = new DatabaseService(userData)
  await db.init()
  const { imported } = importLibraryCatalog(db)
  console.log(`已导入 ${imported} 条全库图鉴 → ${userData}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
