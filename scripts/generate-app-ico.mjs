#!/usr/bin/env node
/**
 * 从 assets/logo/icon-256.png 生成 pack/app.ico（Windows 安装包 / exe 兼容格式）
 * 使用 png2icons 的 forWinExe 模式（BMP 小尺寸 + PNG 大尺寸），Inno Setup 与 rcedit 可正确识别
 */
import { createRequire } from 'module'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const { createICO, BICUBIC } = require('png2icons')

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const logoPng = join(root, 'assets', 'logo', 'icon-256.png')
const outIco = join(root, 'pack', 'app.ico')

if (!existsSync(logoPng)) {
  console.error(`[generate-app-ico] 缺少 ${logoPng}`)
  console.error('[generate-app-ico] 请准备 assets/logo/icon-256.png（白底「万」字 Logo）')
  process.exit(1)
}

const input = readFileSync(logoPng)
const ico = createICO(input, BICUBIC, 0, false, true)

if (!ico || ico.length < 100) {
  console.error('[generate-app-ico] ICO 生成失败')
  process.exit(1)
}

writeFileSync(outIco, ico)
const kb = (ico.length / 1024).toFixed(1)
console.log(`[generate-app-ico] 已写入 ${outIco}（${kb} KB，png2icons / forWinExe）`)
