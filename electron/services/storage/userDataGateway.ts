import type { DatabaseService } from '../core/database'
import type { AppSettings } from '../../../src/shared/types/settings'

export interface UserDataGateway {
  getAppSettings(): Record<string, unknown>
  updateAppSettings(settings: AppSettings): void
}

export class SqliteUserDataGateway implements UserDataGateway {
  constructor(private readonly db: DatabaseService) {}

  getAppSettings(): Record<string, unknown> {
    return this.db.getAppSettings()
  }

  updateAppSettings(settings: AppSettings): void {
    this.db.updateAppSettings(settings)
  }
}
