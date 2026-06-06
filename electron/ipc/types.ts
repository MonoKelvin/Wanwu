import type { DatabaseService } from '../services/core/database'
import type { LibraryService } from '../services/library/service'
import type { LinksService } from '../services/links/service'
import type { DiagramService } from '../services/diagrams/service'
import type { RssService } from '../services/rss/service'
import type { MusicService } from '../services/music/service'
import type { MediaService } from '../services/media/service'
import type { NotesService } from '../services/notes/service'
import type { UserDataGateway } from '../services/storage/userDataGateway'
import type { CloudAbodeService } from '../services/cloud-abode/service'

export interface AppServices {
  db: DatabaseService | null
  library: LibraryService | null
  links: LinksService | null
  diagrams: DiagramService | null
  rss: RssService | null
  music: MusicService | null
  media: MediaService | null
  notes: NotesService | null
  userData: UserDataGateway | null
  cloudAbode?: CloudAbodeService | null
}
