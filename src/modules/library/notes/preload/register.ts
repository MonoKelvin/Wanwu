import { registerPreloadModule } from '@shared/module-bridge/preloadRegistry'
import { notesPreloadModule } from '../main/preloadApi'

registerPreloadModule(notesPreloadModule)
