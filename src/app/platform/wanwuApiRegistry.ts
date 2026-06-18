/**
 * WanwuApi 组合根：集中加载各模块与平台的 module augmentation。
 * 渲染进程在 main.ts 引入；preload 在构建时同样引入以保证类型与 IPC 表一致。
 */
import './wanwuApi'
import.meta.glob(
  ['../../modules/**/domain/wanwuApi.ts', '!../../modules/cloud-abode/**'],
  { eager: true }
)
