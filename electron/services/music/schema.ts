import type Database from 'better-sqlite3'

export function initMusicSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS music_favorites (
      track_key TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      video_id TEXT NOT NULL,
      cover_url TEXT,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS music_history (
      id TEXT PRIMARY KEY,
      track_key TEXT NOT NULL,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      video_id TEXT NOT NULL,
      cover_url TEXT,
      payload_json TEXT NOT NULL,
      played_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_music_history_played ON music_history(played_at DESC);
    CREATE INDEX IF NOT EXISTS idx_music_history_track_key ON music_history(track_key);
    CREATE TABLE IF NOT EXISTS music_cache_index (
      cache_key TEXT PRIMARY KEY,
      file_path TEXT NOT NULL,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
  `)
}
