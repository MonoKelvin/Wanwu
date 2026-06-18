import { registerMainProcessModule } from '@shared/module-bridge/mainProcessRegistry'
import { linksMainModule } from '@modules/library/links/main/linksMainModule'

registerMainProcessModule(linksMainModule)
