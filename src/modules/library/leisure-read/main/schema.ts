import type Database from 'better-sqlite3'

function columnNames(db: Database.Database): Set<string> {
  const rows = db.prepare('PRAGMA table_info(leisure_read_favorites)').all() as Array<{ name: string }>
  return new Set(rows.map((row) => row.name))
}

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

  const names = columnNames(db)
  if (!names.has('article_id')) {
    db.exec('ALTER TABLE leisure_read_favorites ADD COLUMN article_id TEXT')
  }
  if (!names.has('kind')) {
    db.exec("ALTER TABLE leisure_read_favorites ADD COLUMN kind TEXT NOT NULL DEFAULT 'full'")
  }
  if (!names.has('snippets_json')) {
    db.exec('ALTER TABLE leisure_read_favorites ADD COLUMN snippets_json TEXT')
  }
}
