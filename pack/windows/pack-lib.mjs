/**
 * Windows 打包公共模块：日志、exe 元数据、签名、electron-builder afterPack。
 */
import { execFileSync, execSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, rmSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rcedit } from 'rcedit'

export const PACK_DIR = dirname(fileURLToPath(import.meta.url))
export const PACK_ROOT = join(PACK_DIR, '..')
export const ROOT = join(PACK_ROOT, '..')
export const APP_ICO = join(PACK_ROOT, 'app.ico')

export const APP_DISPLAY_NAME = '万物'
export const APP_PUBLISHER = 'MonoStudio'
export const APP_COPYRIGHT = `Copyright (c) ${new Date().getFullYear()} ${APP_PUBLISHER}`

// ── 日志 ─────────────────────────────────────────────────────────────

const useColor =
  process.env.NO_COLOR !== '1' &&
  process.env.FORCE_COLOR !== '0' &&
  (process.stdout.isTTY || process.env.FORCE_COLOR === '1')

const ESC = '\x1b['
const R = `${ESC}0m`
const paint = (code, text) => (useColor ? `${ESC}${code}m${text}${R}` : text)

export const c = {
  tag: (s) => paint('1;36', s),
  step: (s) => paint('1;35', s),
  ok: (s) => paint('1;32', s),
  warn: (s) => paint('1;33', s),
  err: (s) => paint('1;31', s),
  dim: (s) => paint('2', s)
}

const prefix = () => `${c.tag('[pack]')} `

export function packStep(n, total, message) {
  console.log(`${prefix()}${c.step(`${n}/${total}`)}  ${message}`)
}

export function packInfo(message) {
  console.log(`${prefix()}${message}`)
}

export function packDim(message) {
  console.log(`${prefix()}${c.dim(message)}`)
}

export function packOk(message) {
  console.log(`${prefix()}${c.ok('✓')} ${message}`)
}

export function packWarn(message) {
  console.warn(`${prefix()}${c.warn('!')} ${message}`)
}

export function packFail(message) {
  console.error(`${prefix()}${c.err('✗')} ${message}`)
}

// ── 版本 / 元数据 ───────────────────────────────────────────────────

export function readPackageMeta(rootDir = ROOT) {
  const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'))
  const version = String(pkg.version ?? '0.0.0')
  return { version, description: String(pkg.description ?? APP_DISPLAY_NAME) }
}

export function versionToFileVersion(version) {
  const parts = version.split('.').map((n) => String(Number(n) || 0))
  while (parts.length < 4) parts.push('0')
  return parts.slice(0, 4).join('.')
}

export function versionForInno(version) {
  return versionToFileVersion(version)
}

function buildRceditOptions({ version, description, exeName }) {
  const fileVersion = versionToFileVersion(version)
  return {
    'file-version': fileVersion,
    'product-version': fileVersion,
    'version-string': {
      CompanyName: APP_PUBLISHER,
      ProductName: APP_DISPLAY_NAME,
      FileDescription: description,
      LegalCopyright: APP_COPYRIGHT,
      OriginalFilename: exeName,
      InternalName: exeName.replace(/\.exe$/i, ''),
      FileVersion: fileVersion,
      ProductVersion: fileVersion
    }
  }
}

export function findMainExe(stageDir) {
  const exes = readdirSync(stageDir).filter(
    (f) => f.endsWith('.exe') && !/^unins/i.test(f) && !/update/i.test(f)
  )
  if (!exes.length) throw new Error(`在 ${stageDir} 中未找到主程序 .exe`)
  return exes.find((f) => /^wanwu\.exe$/i.test(f)) ?? exes[0]
}

/** 用 rcedit 覆盖 Electron 默认 exe 文件信息 */
export async function applyWinExeMetadata(appOutDir, opts = {}) {
  const rootDir = opts.rootDir ?? ROOT
  const exeName = opts.exeName ?? findMainExe(appOutDir)
  const exePath = join(appOutDir, exeName)
  if (!existsSync(exePath)) throw new Error(`未找到 ${exePath}`)

  const icoPath = opts.icoPath ?? APP_ICO
  const { version, description } = readPackageMeta(rootDir)
  const rceditOpts = buildRceditOptions({ version, description, exeName })
  if (existsSync(icoPath)) rceditOpts.icon = icoPath

  opts.log?.(`写入 ${exeName} 文件信息（${version} · ${APP_DISPLAY_NAME}）…`)
  await rcedit(exePath, rceditOpts)
  return { exePath, exeName, version }
}

// ── 代码签名（signtool；WANWU_SIGN_PFX / WANWU_SELF_SIGN=1）──────────

const SELF_SIGN_SUBJECT = 'CN=Wanwu Dev Code Signing'

function findSigntool() {
  if (process.platform !== 'win32') return null
  try {
    const out = execSync('where signtool', { encoding: 'utf8', windowsHide: true })
    const hit = out
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l && existsSync(l))
    if (hit) return hit
  } catch {
    /* ignore */
  }

  const kitsRoots = [
    process.env['ProgramFiles(x86)']
      ? join(process.env['ProgramFiles(x86)'], 'Windows Kits', '10', 'bin')
      : null,
    process.env.ProgramFiles ? join(process.env.ProgramFiles, 'Windows Kits', '10', 'bin') : null
  ].filter((p) => p && existsSync(p))

  for (const kitsRoot of kitsRoots) {
    for (const ver of readdirSync(kitsRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^\d/.test(d.name))
      .map((d) => d.name)
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))) {
      for (const arch of ['x64', 'x86', 'arm64']) {
        const candidate = join(kitsRoot, ver, arch, 'signtool.exe')
        if (existsSync(candidate)) return candidate
      }
    }
  }
  return null
}

function ensureSelfSignCert() {
  const ps = [
    "$subj = 'CN=Wanwu Dev Code Signing'",
    "$existing = Get-ChildItem Cert:\\CurrentUser\\My | Where-Object { $_.Subject -eq $subj }",
    'if (-not $existing) {',
    "  New-SelfSignedCertificate -Type CodeSigningCert -Subject $subj -KeyUsage DigitalSignature -FriendlyName 'Wanwu Dev' -CertStoreLocation Cert:\\CurrentUser\\My -NotAfter (Get-Date).AddYears(5) | Out-Null",
    '}'
  ].join('; ')
  execSync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${ps}"`, {
    stdio: 'inherit',
    windowsHide: true
  })
}

export function signWindowsBinary(filePath, opts = {}) {
  const label = opts.label ?? filePath
  if (process.env.WANWU_SKIP_SIGN === '1') {
    packDim(`已跳过签名（WANWU_SKIP_SIGN=1）: ${label}`)
    return false
  }
  if (process.platform !== 'win32') {
    packDim(`非 Windows，跳过签名: ${label}`)
    return false
  }
  if (!existsSync(filePath)) {
    packWarn(`签名目标不存在: ${filePath}`)
    return false
  }

  const signtool = findSigntool()
  if (!signtool) {
    packWarn(
      `未找到 signtool，跳过 ${label} 签名（不影响打包；需签名请安装 Windows SDK，或设置 WANWU_SKIP_SIGN=1 隐藏此提示）`
    )
    return false
  }

  const pfx = process.env.WANWU_SIGN_PFX?.trim()
  const pfxPass = process.env.WANWU_SIGN_PASSWORD ?? ''

  try {
    if (pfx && existsSync(pfx)) {
      packInfo(`签名 ${label}（证书 ${pfx}）…`)
      const args = ['sign', '/fd', 'sha256', '/f', pfx]
      if (pfxPass) args.push('/p', pfxPass)
      args.push('/tr', 'http://timestamp.digicert.com', '/td', 'sha256', filePath)
      execFileSync(signtool, args, { stdio: 'inherit', windowsHide: true })
      return true
    }

    if (process.env.WANWU_SELF_SIGN === '1') {
      packInfo(`自签 ${label}（WANWU_SELF_SIGN=1）…`)
      ensureSelfSignCert()
      execFileSync(
        signtool,
        ['sign', '/fd', 'sha256', '/n', SELF_SIGN_SUBJECT, '/a', filePath],
        { stdio: 'inherit', windowsHide: true }
      )
      return true
    }

    packDim(`未配置 WANWU_SIGN_PFX 或 WANWU_SELF_SIGN=1，跳过 ${label} 签名`)
    return false
  } catch (err) {
    packWarn(`签名失败 ${label}: ${err instanceof Error ? err.message : String(err)}`)
    return false
  }
}

// ── electron-builder afterPack ───────────────────────────────────────

function trimLocales(appOutDir) {
  const localesDir = join(appOutDir, 'locales')
  if (!existsSync(localesDir)) return
  const keep = new Set(['zh-CN.pak', 'en-US.pak'])
  let removed = 0
  for (const name of readdirSync(localesDir)) {
    if (keep.has(name)) continue
    unlinkSync(join(localesDir, name))
    removed++
  }
  console.log(`[pack] locales：保留 ${keep.size}，删除 ${removed}`)
}

function trimNativeSharePrebuilds(appOutDir) {
  const prebuilds = join(
    appOutDir,
    'resources',
    'app.asar.unpacked',
    'node_modules',
    'electron-native-share',
    'prebuilds'
  )
  if (!existsSync(prebuilds)) return
  let removed = 0
  for (const name of readdirSync(prebuilds, { withFileTypes: true })) {
    if (!name.isDirectory() || name.name === 'win32-x64') continue
    rmSync(join(prebuilds, name.name), { recursive: true, force: true })
    removed++
  }
  if (removed > 0) {
    console.log(`[pack] electron-native-share prebuilds：删除 ${removed} 个非 win32-x64 目录`)
  }
}

/** @param {import('app-builder-lib').AfterPackContext} context */
export default async function afterPack(context) {
  trimLocales(context.appOutDir)
  if (process.platform !== 'win32') return

  trimNativeSharePrebuilds(context.appOutDir)
  try {
    const { exeName } = await applyWinExeMetadata(context.appOutDir, {
      log: (msg) => console.log(`[pack] ${msg}`)
    })
    console.log(`[pack] 已更新 ${exeName} 文件属性（替换 Electron 默认信息）`)
  } catch (err) {
    console.warn(
      `[pack] 更新 exe 文件信息失败: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}
