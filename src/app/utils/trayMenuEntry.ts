/** 托盘菜单小窗启动时 hash 直达，避免加载主界面壳 */
export function isTrayMenuHash(): boolean {
  return /^#\/tray-menu/.test(window.location.hash)
}
