const [major, minor] = process.versions.node.split('.').map(Number)

const ok = major > 20 || (major === 20 && minor >= 19) || major >= 22

if (!ok) {
  console.error('')
  console.error('[万物] 当前 Node 版本:', process.versions.node)
  console.error('[万物] Vite 7 / electron-vite 5 需要 Node >= 20.19 或 >= 22.12')
  console.error('[万物] 请升级 Node：https://nodejs.org/  或使用 nvm：`nvm install 22 && nvm use`')
  console.error('')
  process.exit(1)
}
