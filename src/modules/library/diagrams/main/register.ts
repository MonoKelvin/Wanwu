import { registerMainProcessModule } from '@shared/module-bridge/mainProcessRegistry'
import { diagramsMainModule } from '@modules/library/diagrams/main/diagramsMainModule'

registerMainProcessModule(diagramsMainModule)
