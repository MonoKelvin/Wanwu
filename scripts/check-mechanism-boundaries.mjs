import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const commandDir = path.join(root, 'src/app/command')
const transactionDir = path.join(root, 'src/app/transaction')
const sharedDir = path.join(root, 'src/app/shared')

const violations = []

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
      entries.push(...(await walk(full)))
    } else if (/\.(ts|tsx|js|mjs|vue)$/.test(item.name)) {
      entries.push(full)
    }
  }
  return entries
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

  if (violations.length > 0) {
    console.error('Mechanism boundary violations:')
    for (const v of violations) console.error(`  - ${v}`)
    process.exit(1)
  }

  console.log('Mechanism boundaries OK')
}

void main()
