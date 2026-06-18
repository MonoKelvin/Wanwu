import { registerMainProcessModule } from '@shared/module-bridge/mainProcessRegistry'
import { musicMainModule } from '@modules/music/main/musicMainModule'

registerMainProcessModule(musicMainModule)
