import { registerPreloadModule } from '@shared/module-bridge/preloadRegistry'
import { musicPreloadModule } from '../main/preloadApi'

registerPreloadModule(musicPreloadModule)
