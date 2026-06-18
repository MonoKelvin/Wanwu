/**
 * SQLite 连接：用户库。业务表由模块 registerDatabaseSchema 扩展；独立库由各模块自行管理。
 */
import Database from 'better-sqlite3'
import type { AppSettings } from '../../../src/shared/types/settings'
import { applyModuleDatabaseSchemas } from '../../app/databaseSchemaBridge'
import {
  ensureWanwuDataLayout,
  getWanwuPathLayout,
  type WanwuPathLayout
} from '../data/paths'

export class DatabaseService {
  private readonly layout: WanwuPathLayout
  private userDb: Database.Database

  constructor(basePath?: string) {
    const root = ensureWanwuDataLayout(basePath)
    this.layout = getWanwuPathLayout(root)

    this.userDb = new Database(this.layout.userDbFile)
  }

  getBasePath(): string {
    return this.layout.root
  }

  async init(_options?: { skipLibrarySeed?: boolean }): Promise<void> {
    this.initUserSchema()
  }

  private initUserSchema(): void {
    this.userDb.exec(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        json TEXT NOT NULL
      );
    `)
    applyModuleDatabaseSchemas(this.userDb)
    const settingsRow = this.userDb.prepare('SELECT id FROM app_settings WHERE id = 1').get()
    if (!settingsRow) {
      this.userDb
        .prepare('INSERT INTO app_settings (id, json) VALUES (1, ?)')
        .run(JSON.stringify({
          navAlign: 'start',
          navDisplay: 'icon',
          rssFetchLimit: 20,
          startupModule: 'last',
          lastActiveModule: 'library',
          rssAutoRefreshMinutes: 0,
          windowStateMode: 'remember',
          colorScheme: 'system'
        }))
    }
  }

  getAppSettings(): Record<string, unknown> {
    const row = this.userDb.prepare('SELECT json FROM app_settings WHERE id = 1').get() as
      | { json: string }
      | undefined
    if (!row) {
      return {}
    }
    try {
      return JSON.parse(row.json) as Record<string, unknown>
    } catch {
      return {}
    }
  }

  updateAppSettings(settings: AppSettings): void {
    this.userDb
      .prepare(
        `INSERT INTO app_settings (id, json) VALUES (1, ?)
         ON CONFLICT(id) DO UPDATE SET json = excluded.json`
      )
      .run(JSON.stringify(settings))
  }

  withUserDatabase<T>(fn: (db: Database.Database) => T): T {
    return fn(this.userDb)
  }

  close(): void {
    this.userDb.close()
  }
}
