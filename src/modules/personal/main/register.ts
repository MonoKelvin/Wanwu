import { registerMainProcessModule } from '@shared/module-bridge/mainProcessRegistry'
import { personalMainModule } from '@modules/personal/main/personalMainModule'

registerMainProcessModule(personalMainModule)
