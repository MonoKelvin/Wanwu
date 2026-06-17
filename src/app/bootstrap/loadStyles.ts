import type { BootMode } from '@app/bootstrap/bootMode'
import { getBootModeContributor } from '@app/modules/bootModeRegistry'

export async function loadStylesForMode(mode: BootMode): Promise<void> {
  await import('@app/styles/tokens.css')

  if (mode === 'tray-menu') {
    await Promise.all([
      import('@app/styles/theme-dark.css'),
      import('@app/styles/tray-action-menu.css'),
      import('@app/styles/tray-menu-popout.css')
    ])
    return
  }

  if (mode === 'daily-widget') {
    await Promise.all([
      import('@app/styles/popout-base.css'),
      import('@app/styles/theme-dark.css')
    ])
    return
  }

  const bootContributor = getBootModeContributor(mode)
  if (bootContributor?.loadStyles) {
    await bootContributor.loadStyles()
    return
  }

  await Promise.all([
    import('@app/styles/theme-dark.css'),
    import('@app/styles/main.css'),
    import('@app/styles/tray-menu-popout.css'),
    import('@app/styles/form-fields.css'),
    import('@app/styles/scrollbars.css'),
    import('@app/styles/theme-components.css')
  ])
}
