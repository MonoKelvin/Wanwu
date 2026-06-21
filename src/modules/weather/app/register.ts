import { registerAppModule } from '@app/modules/moduleRegistryCore'
import { weatherAppModule } from '@modules/weather/app/weatherAppModule'

registerAppModule(weatherAppModule)
