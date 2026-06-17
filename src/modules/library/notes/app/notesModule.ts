import type { RouteRecordRaw } from 'vue-router'
import type { IAppModule } from '@app/modules/types'
import { ROUTE_OUTLET_SHELL } from '@app/router/outletPlaceholder'
import { notesCommandContributor } from '@modules/library/notes/app/command/contributor'
import {
  LIBRARY_NOTES_ROUTE,
  NOTES_PATH,
  NOTES_POPOUT_ROUTE
} from '@modules/library/notes/domain/noteRoutes'
import { isNotePopoutHash } from '@modules/library/notes/domain/notePopoutEntry'
import {
  resumeNotesEditorMount,
  teardownNotesEditorBeforeNavigation
} from '@modules/library/notes/lib/notesEditorLifecycle'
import { useNotePopoutFocusSync } from '@modules/library/notes/lib/notePopoutSync'
import { tryRestoreNotePopouts } from '@modules/library/notes/lib/useNotePopoutAutoRestore'

export const notesAppModule: IAppModule = {
  id: 'wanwu.notes',
  libraryHomeRouteName: LIBRARY_NOTES_ROUTE,

  commandContributor: notesCommandContributor,

  getRoutes(): RouteRecordRaw[] {
    return [
      {
        path: NOTES_PATH,
        name: LIBRARY_NOTES_ROUTE,
        component: ROUTE_OUTLET_SHELL,
        meta: { module: 'library', major: 'notes', title: '便笺' }
      },
      {
        path: '/note-popout/:noteId',
        name: NOTES_POPOUT_ROUTE,
        component: () => import('@modules/library/notes/views/NotePopoutView.vue'),
        meta: { notePopout: true }
      }
    ]
  },

  getLibraryChildRoutes(): RouteRecordRaw[] {
    return [
      {
        path: 'notes',
        redirect: { path: NOTES_PATH, replace: true }
      }
    ]
  },

  resolveLegacyLibraryPath(cat) {
    if (cat === 'notes') return { path: NOTES_PATH }
    return null
  },

  registerNavigation(register) {
    register({
      id: 'wanwu.notes.editor',
      teardownBeforeNavigation: teardownNotesEditorBeforeNavigation,
      shouldResumeAfterNavigation: (to) => to.name === LIBRARY_NOTES_ROUTE,
      resumeAfterNavigation: () => {
        resumeNotesEditorMount()
      }
    })
  },

  registerShellOutlet(register) {
    register({
      id: 'wanwu.notes.main',
      priority: 20,
      matchesRoute: (route) => route.name === LIBRARY_NOTES_ROUTE,
      loadComponent: () =>
        import('@modules/library/notes/views/NotesView.vue').then((m) => m.default)
    })
  },

  registerBootMode(register) {
    register({
      mode: 'note-popout',
      detect: isNotePopoutHash,
      loadRootComponent: () =>
        import('@app/shell/AppNotePopout.vue').then((m) => m.default)
    })
  },

  registerMainAppIntegration(register) {
    register(() => {
      useNotePopoutFocusSync()
    })
  },

  registerMainAppStartup(register) {
    register(({ runWhenIdle, settings }) => {
      if (settings.notesPopoutRestore === 'on-startup') {
        runWhenIdle(() => {
          void tryRestoreNotePopouts('on-startup')
        })
      }
    })
  }
}
