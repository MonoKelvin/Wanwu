import { registerPreloadModule } from '@shared/module-bridge/preloadRegistry'
import { weatherPreloadModule } from '@modules/weather/main/preloadApi'

registerPreloadModule(weatherPreloadModule)
