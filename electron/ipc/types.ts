import type { DatabaseService } from '../services/core/database'
import type { MediaService } from '../services/media/service'
import type { UserDataGateway } from '../services/storage/userDataGateway'

export interface AppServices {
  db: DatabaseService | null
  userData: UserDataGateway | null
  media: MediaService | null
  /** 插件模块运行时服务（按 module id 索引，框架不含业务类型） */
  moduleRuntime: Map<string, unknown>
}
