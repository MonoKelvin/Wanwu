import { registerMainProcessModule } from '@shared/module-bridge/mainProcessRegistry'
import { quickAccessMainModule } from './quickAccessMainModule'

registerMainProcessModule(quickAccessMainModule)
