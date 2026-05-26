import { existsSync, readFileSync, readdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

function firefoxProfilesRoot(): string | null {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA
    return appData ? join(appData, 'Mozilla', 'Firefox') : null
  }
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'Firefox')
  }
  const home = process.env.HOME
  return home ? join(home, '.mozilla', 'firefox') : null
}

function parseDefaultProfilePath(profilesIni: string, root: string): string | null {
  const lines = profilesIni.split(/\r?\n/)
  let current: Record<string, string> = {}
  let defaultPath: string | null = null

  const flush = () => {
    if (current.Path && (current.Default === '1' || current.IsRelative === '1')) {
      const rel = current.Path.replace(/\//g, '\\')
      const candidate = current.IsRelative === '1' ? join(root, rel) : current.Path
      if (current.Default === '1') defaultPath = candidate
      else if (!defaultPath) defaultPath = candidate
    }
    current = {}
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith(';')) continue
    if (trimmed.startsWith('[')) {
      flush()
      continue
    }
    const eq = trimmed.indexOf('=')
    if (eq > 0) {
      current[trimmed.slice(0, eq)] = trimmed.slice(eq + 1)
    }
  }
  flush()
  return defaultPath
}

function findFirstProfileWithPlaces(root: string): string | null {
  const profilesDir = join(root, 'Profiles')
  if (!existsSync(profilesDir)) return null
  for (const name of readdirSync(profilesDir)) {
    const dir = join(profilesDir, name)
    const places = join(dir, 'places.sqlite')
    if (existsSync(places)) return dir
  }
  return null
}

export function resolveFirefoxPlacesPath(_profile = 'default'): string | null {
  const root = firefoxProfilesRoot()
  if (!root) return null

  const iniPath = join(root, 'profiles.ini')
  if (existsSync(iniPath)) {
    try {
      const ini = readFileSync(iniPath, 'utf8')
      const profileDir = parseDefaultProfilePath(ini, root)
      if (profileDir) {
        const places = join(profileDir, 'places.sqlite')
        if (existsSync(places)) return places
      }
    } catch {
      /* fall through */
    }
  }

  const fallback = findFirstProfileWithPlaces(root)
  return fallback ? join(fallback, 'places.sqlite') : null
}
