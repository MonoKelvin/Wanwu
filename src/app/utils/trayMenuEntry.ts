/** 托盘菜单小窗启动时 hash 直达，避免加载主界面壳 */
export function isTrayMenuHash(): boolean {
  const h = window.location.hash.replace(/^#/, '')
  return h === '/tray-menu' || h.startsWith('/tray-menu/') || h.startsWith('/tray-menu?')
}
