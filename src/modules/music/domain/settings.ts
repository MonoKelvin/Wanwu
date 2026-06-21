import type { AppSettings } from '@shared/types/settings'
import { MUSIC_MODULE_ID } from '@modules/music/domain/moduleId'

export type MusicApiMode = 'remote' | 'local'
export type MusicPrimarySource = 'netease' | 'verome' | 'kugou'
export type MusicNeteaseQuality =
  | 'standard'
  | 'higher'
  | 'exhigh'
  | 'lossless'
  | 'hires'
  | 'jyeffect'
  | 'sky'
  | 'dolby'
  | 'jymaster'

export interface MusicModuleSettings {
  apiBaseUrl: string
  apiMode: MusicApiMode
  apiLocalPort: number
  discoverCountry: string
  jamendoClientId: string
  audiusApiKey: string
  primarySource: MusicPrimarySource
  neteasePort: number
  neteaseRealIp: string
  neteaseProxy: string
  neteaseQuality: MusicNeteaseQuality
}

export const DEFAULT_MUSIC_MODULE_SETTINGS: MusicModuleSettings = {
  apiBaseUrl: 'https://verome-api.deno.dev',
  apiMode: 'remote',
  apiLocalPort: 8000,
  discoverCountry: 'China',
  jamendoClientId: '',
  audiusApiKey: '',
  primarySource: 'kugou',
  neteasePort: 25884,
  neteaseRealIp: '',
  neteaseProxy: '',
  neteaseQuality: 'standard'
}

const LEGACY_FIELD_MAP: Array<{ legacy: string; key: keyof MusicModuleSettings }> = [
  { legacy: 'musicApiBaseUrl', key: 'apiBaseUrl' },
  { legacy: 'musicApiMode', key: 'apiMode' },
  { legacy: 'musicApiLocalPort', key: 'apiLocalPort' },
  { legacy: 'musicDiscoverCountry', key: 'discoverCountry' },
  { legacy: 'musicJamendoClientId', key: 'jamendoClientId' },
  { legacy: 'musicAudiusApiKey', key: 'audiusApiKey' },
  { legacy: 'musicPrimarySource', key: 'primarySource' },
  { legacy: 'musicNeteasePort', key: 'neteasePort' },
  { legacy: 'musicNeteaseRealIp', key: 'neteaseRealIp' },
  { legacy: 'musicNeteaseProxy', key: 'neteaseProxy' },
  { legacy: 'musicNeteaseQuality', key: 'neteaseQuality' }
]

function normalizeApiMode(v: unknown): MusicApiMode {
  return v === 'local' ? 'local' : 'remote'
}

function normalizePrimarySource(v: unknown): MusicPrimarySource {
  return v === 'verome' || v === 'netease' || v === 'kugou' ? v : 'kugou'
}

function normalizeNeteaseQuality(v: unknown): MusicNeteaseQuality {
  const qualities: MusicNeteaseQuality[] = [
    'standard',
    'higher',
    'exhigh',
    'lossless',
    'hires',
    'jyeffect',
    'sky',
    'dolby',
    'jymaster'
  ]
  return qualities.includes(v as MusicNeteaseQuality)
    ? (v as MusicNeteaseQuality)
    : 'standard'
}

export function normalizeMusicModuleSettings(
  raw: Record<string, unknown> | undefined
): MusicModuleSettings {
  const defaults = DEFAULT_MUSIC_MODULE_SETTINGS
  const apiBaseUrl =
    typeof raw?.apiBaseUrl === 'string' && raw.apiBaseUrl.trim()
      ? raw.apiBaseUrl.trim()
      : typeof raw?.musicApiBaseUrl === 'string' && raw.musicApiBaseUrl.trim()
        ? raw.musicApiBaseUrl.trim()
        : defaults.apiBaseUrl

  const apiLocalPort =
    typeof raw?.apiLocalPort === 'number' && raw.apiLocalPort > 0
      ? raw.apiLocalPort
      : typeof raw?.musicApiLocalPort === 'number' && raw.musicApiLocalPort > 0
        ? raw.musicApiLocalPort
        : defaults.apiLocalPort

  const discoverCountry =
    typeof raw?.discoverCountry === 'string' && raw.discoverCountry.trim()
      ? raw.discoverCountry.trim()
      : typeof raw?.musicDiscoverCountry === 'string' && raw.musicDiscoverCountry.trim()
        ? raw.musicDiscoverCountry.trim()
        : defaults.discoverCountry

  const neteasePort =
    typeof raw?.neteasePort === 'number' && raw.neteasePort > 0
      ? raw.neteasePort
      : typeof raw?.musicNeteasePort === 'number' && raw.musicNeteasePort > 0
        ? raw.musicNeteasePort
        : defaults.neteasePort

  return {
    apiBaseUrl,
    apiMode: normalizeApiMode(raw?.apiMode ?? raw?.musicApiMode),
    apiLocalPort,
    discoverCountry,
    jamendoClientId:
      typeof raw?.jamendoClientId === 'string'
        ? raw.jamendoClientId
        : typeof raw?.musicJamendoClientId === 'string'
          ? raw.musicJamendoClientId
          : '',
    audiusApiKey:
      typeof raw?.audiusApiKey === 'string'
        ? raw.audiusApiKey
        : typeof raw?.musicAudiusApiKey === 'string'
          ? raw.musicAudiusApiKey
          : '',
    primarySource: normalizePrimarySource(raw?.primarySource ?? raw?.musicPrimarySource),
    neteasePort,
    neteaseRealIp:
      typeof raw?.neteaseRealIp === 'string'
        ? raw.neteaseRealIp
        : typeof raw?.musicNeteaseRealIp === 'string'
          ? raw.musicNeteaseRealIp
          : '',
    neteaseProxy:
      typeof raw?.neteaseProxy === 'string'
        ? raw.neteaseProxy
        : typeof raw?.musicNeteaseProxy === 'string'
          ? raw.musicNeteaseProxy
          : '',
    neteaseQuality: normalizeNeteaseQuality(raw?.neteaseQuality ?? raw?.musicNeteaseQuality)
  }
}

export function readMusicModuleSettings(
  appSettings: Pick<AppSettings, 'moduleSettings'>
): MusicModuleSettings {
  const stored = appSettings.moduleSettings?.[MUSIC_MODULE_ID]
  return normalizeMusicModuleSettings(stored)
}

export function migrateLegacyMusicSettings(
  raw: Record<string, unknown>
): Record<string, unknown> | null {
  const hasLegacy = LEGACY_FIELD_MAP.some(({ legacy }) => legacy in raw)
  if (!hasLegacy) return null
  const migrated: Record<string, unknown> = {}
  for (const { legacy, key } of LEGACY_FIELD_MAP) {
    if (legacy in raw) migrated[key] = raw[legacy]
  }
  return migrated
}
