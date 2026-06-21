import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const commandDir = path.join(root, 'src/app/command')
const transactionDir = path.join(root, 'src/app/transaction')
const sharedDir = path.join(root, 'src/app/shared')

const violations = []

/** 框架层禁止直接 import 业务模块（bootstrap glob 除外） */
const FORBIDDEN_SCAN_DIRS = [
  path.join(root, 'electron'),
  path.join(root, 'src/app'),
  path.join(root, 'src/shared')
]

const ALLOWED_IMPORT_PATTERNS = [
  /mainProcessBootstrap/,
  /preloadBootstrap/,
  /moduleRegistryBootstrap/,
  /wanwuApiRegistry/,
  /settingsContributorBootstrap/,
  /localStorageKeysBootstrap/,
  /types\/quickAccess/,
  /types\/settings/,
  /types\/api/,
  /constants\/modules/
]

async function walk(dir) {
  const entries = []
  let items
  try {
    items = await readdir(dir, { withFileTypes: true })
  } catch {
    return entries
  }
  for (const item of items) {
    const full = path.join(dir, item.name)
    if (item.isDirectory()) {
      if (item.name === 'node_modules' || item.name === 'out') continue
      entries.push(...(await walk(full)))
    } else if (/\.(ts|tsx|js|mjs|vue)$/.test(item.name)) {
      entries.push(full)
    }
  }
  return entries
}

function isModuleImportPath(imp) {
  return (
    imp.includes('@modules/') ||
    imp.includes('src/modules/') ||
    imp.includes('/modules/library/') ||
    /(?:^|\.\.\/)+modules\//.test(imp)
  )
}

function isAllowedModuleImport(imp, filePath) {
  if (ALLOWED_IMPORT_PATTERNS.some((re) => re.test(imp))) return true
  if (filePath.includes('mainProcessBootstrap') && imp.includes('modules')) return true
  if (filePath.includes('preloadBootstrap') && imp.includes('modules')) return true
  if (filePath.includes('moduleRegistryBootstrap') && imp.includes('modules')) return true
  if (filePath.includes('wanwuApiRegistry') && imp.includes('modules')) return true
  if (filePath.startsWith(`electron${path.sep}app${path.sep}`)) return true
  if (filePath.startsWith(`electron${path.sep}main.ts`)) return true
  if (imp.includes('@shared/') || imp.includes('src/shared/')) return true
  return false
}

/** shared/types 不得 re-export 业务模块类型（删除模块后框架须仍可编译） */
async function checkSharedTypesNoModuleReexports() {
  const typesDir = path.join(root, 'src/shared/types')
  let items
  try {
    items = await readdir(typesDir, { withFileTypes: true })
  } catch {
    return
  }
  for (const item of items) {
    if (!item.isFile() || !/\.ts$/.test(item.name)) continue
    const full = path.join(typesDir, item.name)
    const content = await readFile(full, 'utf8')
    if (/from\s+['"][^'"]*modules\//.test(content) || /export\s+\*\s+from\s+['"][^'"]*modules\//.test(content)) {
      violations.push(`shared type bridge: src/shared/types/${item.name} re-exports from modules/`)
    }
  }
}

async function checkForbiddenModuleImports(filePath) {
  const rel = path.relative(root, filePath)
  if (rel.includes(`${path.sep}src${path.sep}modules${path.sep}`)) {
    const content = await readFile(filePath, 'utf8')
    if (content.includes('electron/services/documentPackage')) {
      violations.push(`forbidden electron import: ${rel} imports electron/services/documentPackage (use @shared/documentPackage/node)`)
    }
  }
  if (rel.includes(`${path.sep}src${path.sep}modules${path.sep}`)) return
  if (rel.endsWith('mainProcessBootstrap.ts') || rel.endsWith('preloadBootstrap.ts') || rel.endsWith('moduleRegistryBootstrap.ts')) return
  if (rel.endsWith('wanwuApiRegistry.ts')) return

  const content = await readFile(filePath, 'utf8')
  const importRe = /(?:import|export)\s+.*?from\s+['"]([^'"]+)['"]/g
  let match
  while ((match = importRe.exec(content)) !== null) {
    const imp = match[1]
    if (!isModuleImportPath(imp)) {
      continue
    }
    if (isAllowedModuleImport(imp, rel)) continue
    violations.push(`forbidden module import: ${rel} imports "${imp}"`)
  }
}

async function checkImports(filePath, forbiddenPatterns, label) {
  const rel = path.relative(root, filePath)
  const content = await readFile(filePath, 'utf8')
  const importRe = /(?:import|export)\s+.*?from\s+['"]([^'"]+)['"]/g
  let match
  while ((match = importRe.exec(content)) !== null) {
    const imp = match[1]
    for (const pattern of forbiddenPatterns) {
      if (imp.includes(pattern)) {
        violations.push(`${label}: ${rel} imports "${imp}"`)
      }
    }
  }
}

/** 已迁出到 src/modules 的业务服务目录（不得残留） */
const MIGRATED_BUSINESS_SERVICE_DIRS = ['links', 'rss', 'quickAccess', 'notes', 'library', 'personal', 'diagrams', 'music', 'cloud-abode']

async function checkNoMigratedBusinessServices() {
  for (const name of MIGRATED_BUSINESS_SERVICE_DIRS) {
    const dir = path.join(root, 'electron', 'services', name)
    try {
      const s = await stat(dir)
      if (s.isDirectory()) {
        violations.push(`business service still in electron/services: ${name}`)
      }
    } catch {
      /* ok — directory removed */
    }
  }
}

async function main() {
  try {
    const s = await stat(sharedDir)
    if (s.isDirectory()) {
      const children = await readdir(sharedDir)
      for (const child of children) {
        if (/command-transaction/i.test(child)) {
          violations.push(`Forbidden shared dir: src/app/shared/${child}`)
        }
      }
    }
  } catch {
    // shared dir may not exist
  }

  const commandFiles = await walk(commandDir)
  const transactionFiles = await walk(transactionDir)

  for (const file of commandFiles) {
    await checkImports(file, ['app/transaction', '@app/transaction'], 'command')
  }

  for (const file of transactionFiles) {
    await checkImports(file, ['app/command', '@app/command'], 'transaction')
  }

  for (const dir of FORBIDDEN_SCAN_DIRS) {
    const files = await walk(dir)
    for (const file of files) {
      await checkForbiddenModuleImports(file)
    }
  }

  await checkNoMigratedBusinessServices()
  await checkSharedTypesNoModuleReexports()

  if (violations.length > 0) {
    console.error('Mechanism boundary violations:')
    for (const v of violations) console.error(`  - ${v}`)
    process.exit(1)
  }

  console.log('Mechanism boundaries OK')
}

void main()
