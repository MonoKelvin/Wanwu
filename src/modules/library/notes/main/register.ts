import { registerMainProcessModule } from '@shared/module-bridge/mainProcessRegistry'
import { notesMainModule } from '@modules/library/notes/main/notesMainModule'

registerMainProcessModule(notesMainModule)
