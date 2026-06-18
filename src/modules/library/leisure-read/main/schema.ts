import type Database from 'better-sqlite3'

export function ensureLeisureReadSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS leisure_read_favorites (
      id TEXT PRIMARY KEY,
      tab TEXT NOT NULL,
      content_id TEXT NOT NULL,
      title TEXT,
      body TEXT NOT NULL,
      subtitle TEXT,
      footer TEXT,
      provider_id TEXT,
      created_at INTEGER NOT NULL,
      UNIQUE(tab, content_id)
    );
    CREATE INDEX IF NOT EXISTS idx_leisure_read_favorites_tab ON leisure_read_favorites(tab);
  `)
}
