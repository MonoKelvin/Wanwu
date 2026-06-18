import { registerPreloadModule } from '@shared/module-bridge/preloadRegistry'
import { personalPreloadModule } from '../main/preloadApi'

registerPreloadModule(personalPreloadModule)
