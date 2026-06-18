import { registerPreloadModule } from '@shared/module-bridge/preloadRegistry'
import { rssPreloadModule } from '../main/preloadApi'

registerPreloadModule(rssPreloadModule)
