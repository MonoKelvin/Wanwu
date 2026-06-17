/**
 * WanwuApi 组合根：集中加载各模块与平台的 module augmentation。
 * 渲染进程在 main.ts 引入；preload 在构建时同样引入以保证类型与 IPC 表一致。
 */
import './wanwuApi'
import '@modules/settings/domain/wanwuApi'
import '@modules/personal/domain/wanwuApi'
import '@modules/rss/domain/wanwuApi'
import '@modules/music/domain/wanwuApi'
import '@modules/cloud-abode/domain/wanwuApi'
import '@modules/quick-access/domain/wanwuApi'
import '@modules/library/core/domain/wanwuApi'
import '@modules/library/links/domain/wanwuApi'
import '@modules/library/diagrams/domain/wanwuApi'
import '@modules/library/notes/domain/wanwuApi'
