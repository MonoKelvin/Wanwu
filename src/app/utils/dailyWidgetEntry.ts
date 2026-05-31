/** 日签小窗启动时 hash 直达，避免加载主界面壳 */
export function isDailyWidgetHash(): boolean {
  return /^#\/daily-widget/.test(window.location.hash)
}
