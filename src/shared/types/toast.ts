export type WanwuToastAction = {
  label: string
  onClick: () => void | Promise<void>
}

export type WanwuToastOptions = {
  life?: number
  action?: WanwuToastAction
}

/** 传给 WwToastMessage 的 message 形状（含 PrimeVue 字段与自定义 action） */
export type WanwuToastMessagePayload = {
  severity?: string
  summary?: string
  detail?: string
  actionLabel?: string
  onAction?: () => void | Promise<void>
}
