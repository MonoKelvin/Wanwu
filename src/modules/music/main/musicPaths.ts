import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { WanwuPathLayout } from '@shared/lib/wanwuPaths'

export function musicDbFile(layout: WanwuPathLayout): string {
  return join(layout.db, 'music.sqlite')
}

export function musicCacheAudioDir(layout: WanwuPathLayout): string {
  return join(layout.music, 'cache', 'audio')
}

export function musicCacheCoversDir(layout: WanwuPathLayout): string {
  return join(layout.music, 'cache', 'covers')
}

export function ensureMusicCacheDirs(layout: WanwuPathLayout): void {
  mkdirSync(musicCacheAudioDir(layout), { recursive: true })
  mkdirSync(musicCacheCoversDir(layout), { recursive: true })
}
