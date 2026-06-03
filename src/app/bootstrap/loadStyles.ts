import type { BootMode } from '@app/bootstrap/bootMode'

export async function loadStylesForMode(mode: BootMode): Promise<void> {
  await import('@app/styles/tokens.css')

  if (mode === 'tray-menu') {
    await import('@app/styles/tray-menu-popout.css')
    return
  }

  if (mode === 'daily-widget') {
    await Promise.all([
      import('@app/styles/popout-base.css'),
      import('@app/styles/theme-dark.css')
    ])
    return
  }

  if (mode === 'note-popout') {
    await Promise.all([
      import('@app/styles/popout-base.css'),
      import('@app/styles/theme-dark.css'),
      import('@app/styles/scrollbars.css')
    ])
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
