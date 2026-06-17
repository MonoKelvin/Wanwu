/** 云斋模块共享 DTO（渲染进程 ↔ 主进程） */

export type ProductCategory =
  | 'VEHICLE'
  | 'ILLUSTRATION'
  | 'FURNITURE'
  | 'PET'
  | 'PLANT'
  | 'OTHER'

export type ProductSource = 'seed' | 'api' | 'user'

export interface CaProduct {
  id: string
  sku: string
  name: string
  category: ProductCategory
  subCategory: string | null
  priceCents: number
  description: string | null
  imagePath: string | null
  model3dSlug: string | null
  metadata: Record<string, unknown> | null
  source: ProductSource
  status: 'active' | 'archived'
  createdAt: string
}

export interface CaLedgerEntry {
  id: string
  type: string
  amountCents: number
  balanceAfterCents: number
  refType: string | null
  refId: string | null
  note: string | null
  createdAt: string
}

export interface CaVirtualCard {
  id: string
  maskedNumber: string
  alias: string
  isDefault: boolean
}

export interface CaOrder {
  id: string
  totalCents: number
  status: 'paid' | 'refunded' | 'partial_refund'
  items: CaOrderItem[]
  cardId: string
  paidAt: string
}

export interface CaOrderItem {
  productId: string
  name: string
  priceCents: number
  quantity: number
}

export interface CaTodo {
  id: string
  title: string
  description: string | null
  priority: 'high' | 'medium' | 'low'
  dueDate: string | null
  rewardCents: number
  source: 'system' | 'user'
  status: 'pending' | 'completed' | 'expired'
  completedAt: string | null
  createdAt: string
}

export interface CaInventoryItem {
  id: string
  productId: string
  product: CaProduct
  integrity: number
  state: string
  lifeJson: Record<string, unknown> | null
  acquiredAt: string
}

export interface CaUserProgress {
  level: number
  totalAssetsCents: number
  balanceCents: number
  dailyBonusClaimedAt: string | null
}

export interface CaDashboard {
  balanceCents: number
  level: number
  totalAssetsCents: number
  recentOrders: CaOrder[]
  activeTodos: CaTodo[]
  achievements: CaAchievement[]
  weatherSummary: string | null
}

export interface CaAchievement {
  id: string
  title: string
  unlockedAt: string | null
}

export interface CaToolManifest {
  id: string
  name: string
  category: 'file' | 'fun' | 'study' | 'literature'
  offline: boolean
  dailyRewardLimit: number
  description: string
}

export interface CaToolRewardStatus {
  toolId: string
  usedToday: number
  dailyLimit: number
  canReward: boolean
}

export interface CaToolInvokeResult {
  content: string
  rewarded: boolean
  rewardCents: number
  meta?: Record<string, unknown>
}

export interface CaLifeEvent {
  id: string
  eventType: string
  title: string
  body: string
  payload: Record<string, unknown>
  createdAt: string
  resolved: boolean
}

export interface CaCatalogListParams {
  category?: ProductCategory
  query?: string
  sort?: 'price_asc' | 'price_desc' | 'name' | 'newest'
  limit?: number
  offset?: number
}

export interface CaCheckoutInput {
  productIds: string[]
  cardId: string
  password: string
}

export interface CaCreateUserProductInput {
  name: string
  category: ProductCategory
  description?: string
  imagePath: string
}

export interface CaPriceQuote {
  priceCents: number
  confidence: number
  explanation: string[]
}
