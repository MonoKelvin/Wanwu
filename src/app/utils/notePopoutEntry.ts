/** 独立便笺窗口启动时 hash 直达 popout 路由，避免先闪主界面 */
export function isNotePopoutHash(): boolean {
  return /^#\/note-popout\//.test(window.location.hash)
}
