import type {
  CaCatalogListParams,
  CaCheckoutInput,
  CaDashboard,
  CaInventoryItem,
  CaLedgerEntry,
  CaOrder,
  CaProduct,
  CaTodo,
  CaToolInvokeResult,
  CaToolManifest,
  CaToolRewardStatus,
  CaVirtualCard
} from '@modules/cloud-abode/domain/types'

/** 云斋 IPC 能力块 */
export interface WanwuCloudAbodeApi {
  cloudAbode: {
    getDashboard: () => Promise<CaDashboard | null>
    listLedger: (limit?: number) => Promise<CaLedgerEntry[]>
    listProducts: (params?: CaCatalogListParams) => Promise<CaProduct[]>
    getProduct: (id: string) => Promise<CaProduct | null>
    isProductOwned: (productId: string) => Promise<boolean>
    ownsVehicleSlug: (slug: string) => Promise<boolean>
    listInventory: () => Promise<CaInventoryItem[]>
    listCards: () => Promise<CaVirtualCard[]>
    addCard: (input: { cardNumber: string; alias: string }) => Promise<CaVirtualCard>
    setDefaultCard: (cardId: string) => Promise<void>
    hasPaymentPassword: () => Promise<boolean>
    setPaymentPassword: (password: string) => Promise<void>
    checkout: (input: CaCheckoutInput) => Promise<CaOrder>
    listTodos: () => Promise<CaTodo[]>
    ensureDailyTodos: () => Promise<void>
    createUserTodo: (input: {
      title: string
      description?: string
      priority: 'high' | 'medium' | 'low'
      dueDate?: string | null
      rewardCents: number
    }) => Promise<CaTodo>
    completeTodo: (todoId: string) => Promise<{ todo: CaTodo; balanceCents: number }>
    listTools: () => Promise<CaToolManifest[]>
    getToolRewardStatus: (toolId: string) => Promise<CaToolRewardStatus>
    invokeTool: (toolId: string) => Promise<CaToolInvokeResult>
    saveVehicleCustomization: (slug: string, lifeJson: Record<string, unknown>) => Promise<void>
    getVehicleCustomization: (slug: string) => Promise<Record<string, unknown> | null>
  }
}

declare module '@shared/types/api' {
  interface WanwuApi extends WanwuCloudAbodeApi {}
}
