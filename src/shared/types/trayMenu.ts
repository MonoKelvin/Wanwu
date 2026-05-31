/** 托盘自定义菜单项动作（主进程执行） */
export type TrayMenuAction =
  | 'open-daily'
  | 'open-rss'
  | 'focus-main'
  | 'toggle-daily-widget'
  | 'toggle-palette'
  | 'quit'

export interface TrayMenuContext {
  dailyWidgetOpen: boolean
}
