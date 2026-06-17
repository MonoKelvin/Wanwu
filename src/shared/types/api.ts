/**
 * 渲染进程 / preload 共用的 IPC 类型根。
 * 具体能力由各模块 domain/wanwuApi.ts 与 app/platform/wanwuApi.ts 通过 augmentation 注入。
 */
export interface WanwuApi {}
