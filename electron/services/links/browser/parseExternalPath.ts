import { parseChromiumExternalPath } from './chromium/externalId'
import { parseFirefoxExternalPath } from './firefox/externalId'
import { parseSafariExternalPath } from './safari/externalId'

export function parseBrowserExternalPath(sourceId: string, externalId: string): string | null {
  if (sourceId === 'firefox') return parseFirefoxExternalPath(externalId)
  if (sourceId === 'safari') return parseSafariExternalPath(externalId)
  return parseChromiumExternalPath(sourceId, externalId)
}
