import { registerMainProcessModule } from '@shared/module-bridge/mainProcessRegistry'
import { registerInstallerLibraryPackImport } from '../../../../../electron/app/installerImportBridge'
import { illustratedHandbookMainModule } from '@modules/library/illustrated-handbook/main/illustratedHandbookMainModule'
import { runInstallerLibraryPackImport } from '@modules/library/illustrated-handbook/main/service/installerImport'

registerInstallerLibraryPackImport(runInstallerLibraryPackImport)
registerMainProcessModule(illustratedHandbookMainModule)
