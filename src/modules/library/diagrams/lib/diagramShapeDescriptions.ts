import type { DiagramShapeItem } from '@modules/library/diagrams/lib/diagramShapeTypes'

/** 仅对不常见或易误解的图形提供说明；常见基础图形不展示 tooltip */
const SHAPE_DESCRIPTIONS: Record<string, string> = {
  'dg-subprocess': '嵌套引用的子流程，两侧竖线表示可复用流程块',
  'dg-preparation': '流程准备或初始化步骤，六边形轮廓',
  'dg-manual-input': '需人工录入或键盘输入的数据',
  'dg-delay': '等待、延时或缓冲处理',
  'dg-display': '向用户展示或输出信息',
  'dg-data': '平行四边形数据符号，表示输入/输出数据',
  'dg-stored-data': '持久化存储的数据或文件',
  'dg-or': '逻辑“或”汇合，多路满足其一即可继续',
  'dg-off-page': '跨页或跨图的流程连接符',
  'dg-merge': '将多条分支合并为一条流程',
  'dg-connector': '连线锚点，用于精确连接位置',
  'dg-multi-document': '多份相关文档或报告',
  'dg-document': '单份文档、报告或纸质材料',
  'dg-uml-class': 'UML 类，含属性与方法分区',
  'dg-uml-interface': 'UML 接口定义',
  'dg-actor': '用例图参与者，表示用户或外部系统',
  'dg-note': 'UML 说明便签，附在元素旁补充注释',
  'dg-swimlane': '泳道，按角色或系统划分职责区域',
  'dg-xor-gateway': '排他网关，仅允许一条分支继续',
  'dg-cloud': '云服务、托管环境或外部平台',
  'dg-server': '应用服务器或计算节点',
  'dg-api': '对外或对内提供的 API 服务',
  'dg-queue': '消息队列、异步缓冲或事件通道',
  'dg-database': '关系型或通用数据库存储',
  'dg-cache': '缓存层，加速读取热点数据',
  'dg-load-balancer': '负载均衡，分发流量到多个节点',
  'dg-container': '容器或部署单元',
  'dg-uml-package': 'UML 包，组织相关类与接口',
  'dg-uml-component': '可部署的软件组件',
  'dg-bpmn-start': 'BPMN 开始事件',
  'dg-bpmn-end': 'BPMN 结束事件',
  'dg-bpmn-gateway': 'BPMN 排他网关，互斥分支',
  'dg-bpmn-intermediate': 'BPMN 中间事件或里程碑',
  'dg-bpmn-lane': 'BPMN 泳道，划分流程职责',
  'dg-image': '插入本地或内嵌图片',
  'dg-comment': '画布注释框，说明补充信息',
  'dg-callout': '带折角的标注说明框',
  'dg-summing-junction': '多条分支汇合后的求和节点，圆圈内常用「+」',
  'dg-internal-storage': '流程图内部存储符号，表示临时或内部数据区',
  'dg-client': '架构图中的终端用户或外部客户端',
  'dg-bpmn-subprocess': 'BPMN 可折叠子流程',
  'dg-bpmn-message': 'BPMN 消息或文档相关元素',
  'dg-bpmn-task': 'BPMN 可执行的任务活动'
}

export function getShapeTooltip(item: DiagramShapeItem): string | undefined {
  return SHAPE_DESCRIPTIONS[item.id]
}
