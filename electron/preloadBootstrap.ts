/** Preload 插件引导：仅 eager 加载各模块 preload/register.ts，避免拖入主进程依赖图 */
import.meta.glob('../src/modules/**/preload/register.ts', { eager: true })
