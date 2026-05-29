import type { Plugin } from 'vite'

/**
 * Electron 渲染进程开发：对源码变更统一整页刷新，避免部分 HMR 与
 * KeepAlive / TipTap / 多 BrowserWindow / App 双壳 组合后界面错乱。
 * 主进程与 preload 仍由 electron-vite 自行重启或 reload。
 */
export function rendererFullReloadInDev(): Plugin {
  return {
    name: 'wanwu-renderer-full-reload',
    apply: 'serve',
    handleHotUpdate({ server }) {
      server.ws.send({ type: 'full-reload' })
      return []
    }
  }
}
