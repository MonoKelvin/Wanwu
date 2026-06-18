import Database from 'better-sqlite3'
import { ensureWanwuDataLayout, getWanwuPathLayout } from '../../../../../electron/services/data/paths'
import { ensureMusicCacheDirs, musicDbFile } from '../musicPaths'
import { initMusicSchema } from './schema'

export class MusicDatabase {
  private readonly db: Database.Database

  constructor(basePath: string) {
    const root = ensureWanwuDataLayout(basePath)
    const layout = getWanwuPathLayout(root)
    ensureMusicCacheDirs(layout)
    this.db = new Database(musicDbFile(layout))
    initMusicSchema(this.db)
  }

  getDb(): Database.Database {
    return this.db
  }

  close(): void {
    this.db.close()
  }
}
