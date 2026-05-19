/**
 * Windows 开发时若 HTTP 加载 Vite 失败，主进程会回退到 out/renderer/index.html。
 * 首次 dev 前若无该文件则先构建一次 renderer。
 */
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const html = join(root, 'out', 'renderer', 'index.html')

if (!existsSync(html)) {
  console.log('[万物] 未找到 out/renderer，正在构建 renderer 备用包…')
  const r = spawnSync('npx', ['electron-vite', 'build'], {
    cwd: root,
    stdio: 'inherit',
    shell: true
  })
  if (r.status !== 0) process.exit(r.status ?? 1)
}
