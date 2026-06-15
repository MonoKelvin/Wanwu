/** 流程图命令参数基类；调用方构建具体参数结构体后传入 */
export interface IDiagramCommandParams {
  readonly [key: string]: unknown
}

/** 无参命令占位 */
export type DiagramEmptyParams = IDiagramCommandParams

export function castDiagramParams<P extends IDiagramCommandParams>(params: IDiagramCommandParams | undefined): P {
  return (params ?? {}) as P
}
