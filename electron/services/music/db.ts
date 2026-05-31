import Database from 'better-sqlite3'
import { ensureWanwuDataLayout, getWanwuPathLayout } from '../data/paths'
import { initMusicSchema } from './schema'

export class MusicDatabase {
  private readonly db: Database.Database

  constructor(basePath: string) {
    const root = ensureWanwuDataLayout(basePath)
    const layout = getWanwuPathLayout(root)
    this.db = new Database(layout.musicDbFile)
    initMusicSchema(this.db)
  }

  getDb(): Database.Database {
    return this.db
  }

  close(): void {
    this.db.close()
  }
}
