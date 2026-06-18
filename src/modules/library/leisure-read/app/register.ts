import { registerAppModule } from '@app/modules/moduleRegistryCore'
import { leisureReadAppModule } from '@modules/library/leisure-read/app/leisureReadModule'
import '@modules/library/leisure-read/domain/wanwuApi'

registerAppModule(leisureReadAppModule)
