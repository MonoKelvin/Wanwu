/** 诊断报告所需的 RSS 只读能力（避免框架层依赖 RSS 模块实现） */
export interface RssDiagnosticsSource {
  listGroups(): unknown[]
  listFeeds(): unknown[]
}
