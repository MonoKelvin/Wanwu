/**
 * 链接 IPC DTO 稳定入口（主进程 / preload 沿用此路径）。
 * 类型定义在 links 模块 domain，此处仅 re-export。
 */
export type * from '@modules/library/links/domain/types'
