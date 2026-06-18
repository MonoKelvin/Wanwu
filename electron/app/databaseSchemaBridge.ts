import type Database from 'better-sqlite3'
import { getMainProcessModules } from '../../src/shared/module-bridge/mainProcessRegistry'

export function applyModuleDatabaseSchemas(db: Database.Database): void {
  for (const mod of getMainProcessModules()) {
    mod.registerDatabaseSchema?.(db)
  }
}
