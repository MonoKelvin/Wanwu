import type Database from 'better-sqlite3'

/** 打开图鉴库时补齐 items / item_media 列（与种子导入逻辑一致） */
export function ensureLibraryItemColumns(db: Database.Database): void {
  const cols = db.prepare('PRAGMA table_info(items)').all() as Array<{ name: string }>
  const names = new Set(cols.map((c) => c.name))
  if (!names.has('slug')) db.exec('ALTER TABLE items ADD COLUMN slug TEXT')
  if (!names.has('specs')) db.exec('ALTER TABLE items ADD COLUMN specs TEXT')
  if (!names.has('cover_attribution')) db.exec('ALTER TABLE items ADD COLUMN cover_attribution TEXT')
  if (!names.has('content_file')) db.exec('ALTER TABLE items ADD COLUMN content_file TEXT')
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_items_slug ON items(slug) WHERE slug IS NOT NULL')
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_items_id ON items(id)')

  const mediaCols = db.prepare('PRAGMA table_info(item_media)').all() as Array<{ name: string }>
  if (!mediaCols.some((c) => c.name === 'attribution')) {
    db.exec('ALTER TABLE item_media ADD COLUMN attribution TEXT')
  }
}
