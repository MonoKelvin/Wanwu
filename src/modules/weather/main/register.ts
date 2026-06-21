import { registerMainProcessModule } from '@shared/module-bridge/mainProcessRegistry'
import { weatherMainModule } from '@modules/weather/main/weatherMainModule'

registerMainProcessModule(weatherMainModule)
