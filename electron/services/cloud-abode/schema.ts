import type Database from 'better-sqlite3'

export const CA_SCHEMA_VERSION = 1

export function initCloudAbodeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ca_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ca_wallets (
      user_id TEXT PRIMARY KEY DEFAULT 'local',
      balance_cents INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ca_ledger_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'local',
      type TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      balance_after_cents INTEGER NOT NULL,
      ref_type TEXT,
      ref_id TEXT,
      note TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ca_ledger_user_time ON ca_ledger_entries(user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS ca_products (
      id TEXT PRIMARY KEY,
      sku TEXT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      sub_category TEXT,
      price_cents INTEGER NOT NULL,
      description TEXT,
      image_path TEXT,
      model_3d_slug TEXT,
      metadata_json TEXT,
      source TEXT NOT NULL DEFAULT 'seed',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ca_products_cat ON ca_products(category, status);

    CREATE TABLE IF NOT EXISTS ca_inventory_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'local',
      product_id TEXT NOT NULL,
      integrity REAL NOT NULL DEFAULT 100,
      state TEXT NOT NULL DEFAULT 'normal',
      life_json TEXT,
      acquired_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES ca_products(id)
    );

    CREATE TABLE IF NOT EXISTS ca_orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'local',
      total_cents INTEGER NOT NULL,
      status TEXT NOT NULL,
      items_json TEXT NOT NULL,
      card_id TEXT NOT NULL,
      paid_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ca_virtual_cards (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'local',
      masked_number TEXT NOT NULL,
      alias TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ca_payment_secrets (
      user_id TEXT PRIMARY KEY DEFAULT 'local',
      password_hash TEXT NOT NULL,
      fail_count INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT
    );

    CREATE TABLE IF NOT EXISTS ca_todos (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'local',
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date TEXT,
      reward_cents INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'system',
      status TEXT NOT NULL DEFAULT 'pending',
      completed_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ca_tool_reward_logs (
      user_id TEXT NOT NULL DEFAULT 'local',
      tool_id TEXT NOT NULL,
      log_date TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, tool_id, log_date)
    );

    CREATE TABLE IF NOT EXISTS ca_life_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'local',
      entity_id TEXT,
      event_type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      payload_json TEXT,
      resolved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ca_user_progress (
      user_id TEXT PRIMARY KEY DEFAULT 'local',
      level INTEGER NOT NULL DEFAULT 1,
      total_assets_cents INTEGER NOT NULL DEFAULT 0,
      daily_bonus_claimed_at TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ca_event_cooldowns (
      user_id TEXT NOT NULL DEFAULT 'local',
      event_key TEXT NOT NULL,
      last_at TEXT NOT NULL,
      PRIMARY KEY (user_id, event_key)
    );
  `)

  const row = db.prepare(`SELECT value FROM ca_meta WHERE key = 'schema_version'`).get() as
    | { value: string }
    | undefined
  if (!row) {
    db.prepare(`INSERT INTO ca_meta (key, value) VALUES ('schema_version', ?)`).run(
      String(CA_SCHEMA_VERSION)
    )
  }
}
