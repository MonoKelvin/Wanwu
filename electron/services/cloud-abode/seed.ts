import { randomUUID } from 'crypto'
import type Database from 'better-sqlite3'

export interface SeedProduct {
  id: string
  sku: string
  name: string
  category: string
  subCategory?: string
  priceCents: number
  description?: string
  imagePath?: string
  model3dSlug?: string
  metadata?: Record<string, unknown>
}

export const SEED_PRODUCTS: SeedProduct[] = [
  {
    id: 'ca-prod-su7',
    sku: 'vehicle-xiaomi-su7',
    name: '小米 SU7 Max',
    category: 'VEHICLE',
    subCategory: 'sport',
    priceCents: 2_000_000_00,
    description: '参考真实市场超跑/高端电动轿车价位锚定（200 万元）',
    model3dSlug: 'xiaomi-su7'
  },
  {
    id: 'ca-prod-sofa',
    sku: 'furniture-sofa-basic',
    name: '北欧布艺三人沙发',
    category: 'FURNITURE',
    subCategory: 'sofa',
    priceCents: 30_000,
    description: '参考真实市场同类沙发约 300 元'
  },
  {
    id: 'ca-prod-desk',
    sku: 'furniture-desk',
    name: '实木书桌',
    category: 'FURNITURE',
    priceCents: 80_000,
    description: '参考真实市场约 800 元'
  },
  {
    id: 'ca-prod-monstera',
    sku: 'plant-monstera',
    name: '龟背竹',
    category: 'PLANT',
    priceCents: 4_500,
    description: '常见室内绿植'
  },
  {
    id: 'ca-prod-cat',
    sku: 'pet-cat',
    name: '英短蓝猫',
    category: 'PET',
    priceCents: 30_000_00,
    description: '宠物猫参考价'
  },
  {
    id: 'ca-prod-illust-1',
    sku: 'illust-sample-1',
    name: '立绘·晨光',
    category: 'ILLUSTRATION',
    priceCents: 0,
    description: '系统赠送立绘样例'
  },
  {
    id: 'ca-prod-home-1',
    sku: 'home-apartment-a',
    name: '都市公寓 A 型',
    category: 'OTHER',
    subCategory: 'residence',
    priceCents: 0,
    description: '系统预设居住空间（不可购买，仅展示）',
    metadata: { residence: true, address: '云斋·城东 1 号', area: '89㎡' }
  }
]

export function seedCloudAbodeProducts(db: Database.Database): void {
  const now = new Date().toISOString()
  const insert = db.prepare(`
    INSERT INTO ca_products (
      id, sku, name, category, sub_category, price_cents, description,
      image_path, model_3d_slug, metadata_json, source, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'seed', 'active', ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      price_cents = excluded.price_cents,
      description = excluded.description,
      model_3d_slug = excluded.model_3d_slug,
      metadata_json = excluded.metadata_json
  `)

  for (const p of SEED_PRODUCTS) {
    insert.run(
      p.id,
      p.sku,
      p.name,
      p.category,
      p.subCategory ?? null,
      p.priceCents,
      p.description ?? null,
      p.imagePath ?? null,
      p.model3dSlug ?? null,
      p.metadata ? JSON.stringify(p.metadata) : null,
      now
    )
  }
}

export function ensureWalletInitialized(db: Database.Database): void {
  const now = new Date().toISOString()
  const row = db.prepare(`SELECT balance_cents FROM ca_wallets WHERE user_id = 'local'`).get()
  if (!row) {
    db.prepare(
      `INSERT INTO ca_wallets (user_id, balance_cents, updated_at) VALUES ('local', ?, ?)`
    ).run(50_000, now)
    const ledgerId = randomUUID()
    db.prepare(`
      INSERT INTO ca_ledger_entries (
        id, user_id, type, amount_cents, balance_after_cents, ref_type, note, created_at
      ) VALUES (?, 'local', 'initial_grant', ?, ?, 'system', '新用户启动资金', ?)
    `).run(ledgerId, 50_000, 50_000, now)
  }

  const progress = db.prepare(`SELECT user_id FROM ca_user_progress WHERE user_id = 'local'`).get()
  if (!progress) {
    db.prepare(`
      INSERT INTO ca_user_progress (user_id, level, total_assets_cents, updated_at)
      VALUES ('local', 1, ?, ?)
    `).run(50_000, now)
  }
}
