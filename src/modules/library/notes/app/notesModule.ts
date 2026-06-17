import type { RouteRecordRaw } from 'vue-router'
import { installPopoutShellPlugins } from '@app/bootstrap/popoutShellPlugins'
import type { IAppModule } from '@app/modules/types'
import { ROUTE_OUTLET_SHELL } from '@app/router/outletPlaceholder'
import { notesCommandContributor } from '@modules/library/notes/app/command/contributor'
import {
  LIBRARY_NOTES_ROUTE,
  NOTES_BOOT_MODE,
  NOTES_PATH,
  NOTES_POPOUT_ROUTE
} from '@modules/library/notes/domain/noteRoutes'
import { isNotePopoutHash } from '@modules/library/notes/domain/notePopoutEntry'
import {
  resumeNotesEditorMount,
  teardownNotesEditorBeforeNavigation
} from '@modules/library/notes/lib/notesEditorLifecycle'
import { useNotePopoutFocusSync } from '@modules/library/notes/lib/notePopoutSync'
import { useNotesStore } from '@modules/library/notes/services/notesStore'
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

  getLibrarySubmodule() {
    return {
      id: 'notes',
      routeName: LIBRARY_NOTES_ROUTE,
      buildSectionTree() {
        return []
      }
    }
  },

  resolveLegacyLibraryPath(cat) {
    if (cat === 'notes') return { path: NOTES_PATH }
    return null
  },

  belongsToLibraryPath(path) {
    return path === NOTES_PATH || path.startsWith(`${NOTES_PATH}/`)
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
      mode: NOTES_BOOT_MODE,
      detect: isNotePopoutHash,
      loadRootComponent: () =>
        import('@modules/library/notes/shell/NotePopoutShell.vue').then((m) => m.default),
      loadStyles: async () => {
        await Promise.all([
          import('@app/styles/popout-base.css'),
          import('@app/styles/theme-dark.css'),
          import('@app/styles/scrollbars.css')
        ])
      },
      needsToastStack: true,
      installUiPlugins: installPopoutShellPlugins
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
  },

  registerQuickAccess(register) {
    register({
      kind: 'note',
      paletteMeta: { label: '便笺', icon: 'pencil', order: 20 },
      async open(target, ctx) {
        const noteId = target.noteId ?? target.id
        if (!noteId) return false
        const notesStore = useNotesStore()
        if (!notesStore.notes.length) await notesStore.loadAll()
        await ctx.pushRoute({ name: LIBRARY_NOTES_ROUTE })
        await ctx.afterRouteReady()
        notesStore.setSelected(noteId)
      }
    })
  },

  registerSettingsSection(register) {
    register({
      id: 'library',
      label: '全库',
      icon: 'book-open',
      order: 20,
      loadPanel: () =>
        import('@modules/library/notes/settings/NotesSettingsPanel.vue').then((m) => m.default)
    })
  }
}
