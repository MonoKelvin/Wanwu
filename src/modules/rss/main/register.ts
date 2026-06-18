import { registerMainProcessModule } from '@shared/module-bridge/mainProcessRegistry'
import { rssMainModule } from '@modules/rss/main/rssMainModule'

registerMainProcessModule(rssMainModule)
