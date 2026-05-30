import { mkdirSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import Database from 'better-sqlite3'
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
} from '../../../src/shared/types/cloud-abode'
import { initCloudAbodeSchema } from './schema'
import { ensureWalletInitialized, seedCloudAbodeProducts } from './seed'
import {
  computeLevel,
  getLevelLimits,
  toolRewardCents
} from './policies'
import { TOOL_MANIFEST, getToolManifest } from './toolManifest'
import { SYSTEM_TODO_POOL, randomRiddle } from './todoPool'
import {
  fetchDailyPoem,
  fetchHitokoto,
  fetchJoke,
  fetchKanaLesson,
  fetchWord
} from './api/adapters'
import {
  hashPaymentPassword,
  luhnValid,
  maskCardNumber,
  todayDateKey,
  verifyPaymentPassword
} from './utils'

const USER_ID = 'local'
const PAYMENT_LOCK_MS = 5 * 60 * 1000
const MAX_PAYMENT_FAILS = 3

type ProductRow = {
  id: string
  sku: string
  name: string
  category: string
  sub_category: string | null
  price_cents: number
  description: string | null
  image_path: string | null
  model_3d_slug: string | null
  metadata_json: string | null
  source: string
  status: string
  created_at: string
}

export class CloudAbodeService {
  private db: Database.Database | null = null

  open(userDataPath: string): void {
    const dir = join(userDataPath, 'cloud-abode')
    mkdirSync(dir, { recursive: true })
    const dbPath = join(dir, 'database.sqlite')
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    initCloudAbodeSchema(this.db)
    seedCloudAbodeProducts(this.db)
    ensureWalletInitialized(this.db)
    this.ensureDailyTodos()
  }

  private requireDb(): Database.Database {
    if (!this.db) throw new Error('CloudAbode database not initialized')
    return this.db
  }

  private rowToProduct(row: ProductRow): CaProduct {
    return {
      id: row.id,
      sku: row.sku,
      name: row.name,
      category: row.category as CaProduct['category'],
      subCategory: row.sub_category,
      priceCents: row.price_cents,
      description: row.description,
      imagePath: row.image_path,
      model3dSlug: row.model_3d_slug,
      metadata: row.metadata_json ? (JSON.parse(row.metadata_json) as Record<string, unknown>) : null,
      source: row.source as CaProduct['source'],
      status: row.status as CaProduct['status'],
      createdAt: row.created_at
    }
  }

  private getBalanceCents(): number {
    const db = this.requireDb()
    const row = db
      .prepare(`SELECT balance_cents FROM ca_wallets WHERE user_id = ?`)
      .get(USER_ID) as { balance_cents: number } | undefined
    return row?.balance_cents ?? 0
  }

  private computeTotalAssetsCents(): number {
    const db = this.requireDb()
    const balance = this.getBalanceCents()
    const inv = db
      .prepare(
        `SELECT COALESCE(SUM(p.price_cents), 0) AS total FROM ca_inventory_items i
         JOIN ca_products p ON p.id = i.product_id WHERE i.user_id = ?`
      )
      .get(USER_ID) as { total: number }
    return balance + (inv?.total ?? 0)
  }

  private syncUserProgress(): { level: number; totalAssetsCents: number } {
    const db = this.requireDb()
    const totalAssetsCents = this.computeTotalAssetsCents()
    const level = computeLevel(totalAssetsCents)
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO ca_user_progress (user_id, level, total_assets_cents, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         level = excluded.level,
         total_assets_cents = excluded.total_assets_cents,
         updated_at = excluded.updated_at`
    ).run(USER_ID, level, totalAssetsCents, now)
    return { level, totalAssetsCents }
  }

  private credit(
    amountCents: number,
    type: string,
    refType: string | null,
    refId: string | null,
    note: string
  ): number {
    const db = this.requireDb()
    const tx = db.transaction(() => {
      const wallet = db
        .prepare(`SELECT balance_cents FROM ca_wallets WHERE user_id = ?`)
        .get(USER_ID) as { balance_cents: number }
      const newBalance = wallet.balance_cents + amountCents
      const now = new Date().toISOString()
      db.prepare(`UPDATE ca_wallets SET balance_cents = ?, updated_at = ? WHERE user_id = ?`).run(
        newBalance,
        now,
        USER_ID
      )
      const ledgerId = randomUUID()
      db.prepare(
        `INSERT INTO ca_ledger_entries (
          id, user_id, type, amount_cents, balance_after_cents, ref_type, ref_id, note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(ledgerId, USER_ID, type, amountCents, newBalance, refType, refId, note, now)
      return newBalance
    })
    const balance = tx()
    this.syncUserProgress()
    return balance
  }

  getDashboard(): CaDashboard {
    const db = this.requireDb()
    this.ensureDailyTodos()
    const { level, totalAssetsCents } = this.syncUserProgress()
    const balanceCents = this.getBalanceCents()

    const orderRows = db
      .prepare(
        `SELECT id, total_cents, status, items_json, card_id, paid_at FROM ca_orders
         WHERE user_id = ? ORDER BY paid_at DESC LIMIT 5`
      )
      .all(USER_ID) as Array<{
      id: string
      total_cents: number
      status: string
      items_json: string
      card_id: string
      paid_at: string
    }>

    const recentOrders: CaOrder[] = orderRows.map((o) => ({
      id: o.id,
      totalCents: o.total_cents,
      status: o.status as CaOrder['status'],
      items: JSON.parse(o.items_json),
      cardId: o.card_id,
      paidAt: o.paid_at
    }))

    const activeTodos = this.listTodos().filter((t) => t.status === 'pending').slice(0, 8)

    const hasOrder = orderRows.length > 0
    const achievements = [
      {
        id: 'welcome',
        title: '初入云斋',
        unlockedAt: new Date().toISOString()
      },
      {
        id: 'first_purchase',
        title: '首笔虚拟消费',
        unlockedAt: hasOrder ? orderRows[0]!.paid_at : null
      }
    ]

    return {
      balanceCents,
      level,
      totalAssetsCents,
      recentOrders,
      activeTodos,
      achievements,
      weatherSummary: null
    }
  }

  listLedger(limit = 50): CaLedgerEntry[] {
    const db = this.requireDb()
    const rows = db
      .prepare(
        `SELECT id, type, amount_cents, balance_after_cents, ref_type, ref_id, note, created_at
         FROM ca_ledger_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
      )
      .all(USER_ID, limit) as Array<{
      id: string
      type: string
      amount_cents: number
      balance_after_cents: number
      ref_type: string | null
      ref_id: string | null
      note: string | null
      created_at: string
    }>
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      amountCents: r.amount_cents,
      balanceAfterCents: r.balance_after_cents,
      refType: r.ref_type,
      refId: r.ref_id,
      note: r.note,
      createdAt: r.created_at
    }))
  }

  listProducts(params: CaCatalogListParams = {}): CaProduct[] {
    const db = this.requireDb()
    const conditions = [`status = 'active'`]
    const values: unknown[] = []

    if (params.category) {
      conditions.push(`category = ?`)
      values.push(params.category)
    }
    if (params.query?.trim()) {
      conditions.push(`(name LIKE ? OR description LIKE ?)`)
      const q = `%${params.query.trim()}%`
      values.push(q, q)
    }

    let orderBy = 'created_at DESC'
    if (params.sort === 'price_asc') orderBy = 'price_cents ASC'
    else if (params.sort === 'price_desc') orderBy = 'price_cents DESC'
    else if (params.sort === 'name') orderBy = 'name ASC'

    const limit = params.limit ?? 200
    const offset = params.offset ?? 0

    const sql = `SELECT * FROM ca_products WHERE ${conditions.join(' AND ')} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
    values.push(limit, offset)
    const rows = db.prepare(sql).all(...values) as ProductRow[]
    return rows.map((r) => this.rowToProduct(r))
  }

  getProduct(id: string): CaProduct | null {
    const db = this.requireDb()
    const row = db.prepare(`SELECT * FROM ca_products WHERE id = ?`).get(id) as ProductRow | undefined
    return row ? this.rowToProduct(row) : null
  }

  isProductOwned(productId: string): boolean {
    const db = this.requireDb()
    const row = db
      .prepare(`SELECT id FROM ca_inventory_items WHERE user_id = ? AND product_id = ?`)
      .get(USER_ID, productId)
    return !!row
  }

  ownsVehicleSlug(slug: string): boolean {
    const db = this.requireDb()
    const row = db
      .prepare(
        `SELECT i.id FROM ca_inventory_items i
         JOIN ca_products p ON p.id = i.product_id
         WHERE i.user_id = ? AND p.model_3d_slug = ?`
      )
      .get(USER_ID, slug)
    return !!row
  }

  listInventory(): CaInventoryItem[] {
    const db = this.requireDb()
    const rows = db
      .prepare(
        `SELECT i.id, i.product_id, i.integrity, i.state, i.life_json, i.acquired_at, p.*
         FROM ca_inventory_items i
         JOIN ca_products p ON p.id = i.product_id
         WHERE i.user_id = ? ORDER BY i.acquired_at DESC`
      )
      .all(USER_ID) as Array<
      ProductRow & {
        id: string
        product_id: string
        integrity: number
        state: string
        life_json: string | null
        acquired_at: string
      }
    >

    return rows.map((r) => ({
      id: r.id,
      productId: r.product_id,
      product: this.rowToProduct(r),
      integrity: r.integrity,
      state: r.state,
      lifeJson: r.life_json ? (JSON.parse(r.life_json) as Record<string, unknown>) : null,
      acquiredAt: r.acquired_at
    }))
  }

  listCards(): CaVirtualCard[] {
    const db = this.requireDb()
    const rows = db
      .prepare(
        `SELECT id, masked_number, alias, is_default FROM ca_virtual_cards WHERE user_id = ? ORDER BY is_default DESC, created_at ASC`
      )
      .all(USER_ID) as Array<{
      id: string
      masked_number: string
      alias: string
      is_default: number
    }>
    return rows.map((r) => ({
      id: r.id,
      maskedNumber: r.masked_number,
      alias: r.alias,
      isDefault: r.is_default === 1
    }))
  }

  addCard(input: { cardNumber: string; alias: string }): CaVirtualCard {
    if (!luhnValid(input.cardNumber)) {
      throw new Error('卡号格式无效，请使用通过 Luhn 校验的模拟卡号')
    }
    const db = this.requireDb()
    const id = randomUUID()
    const masked = maskCardNumber(input.cardNumber)
    const now = new Date().toISOString()
    const existing = this.listCards()
    const isDefault = existing.length === 0 ? 1 : 0
    db.prepare(
      `INSERT INTO ca_virtual_cards (id, user_id, masked_number, alias, is_default, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, USER_ID, masked, input.alias.trim() || '我的卡', isDefault, now)
    return { id, maskedNumber: masked, alias: input.alias.trim() || '我的卡', isDefault: isDefault === 1 }
  }

  setDefaultCard(cardId: string): void {
    const db = this.requireDb()
    const tx = db.transaction(() => {
      db.prepare(`UPDATE ca_virtual_cards SET is_default = 0 WHERE user_id = ?`).run(USER_ID)
      db.prepare(`UPDATE ca_virtual_cards SET is_default = 1 WHERE id = ? AND user_id = ?`).run(
        cardId,
        USER_ID
      )
    })
    tx()
  }

  hasPaymentPassword(): boolean {
    const db = this.requireDb()
    const row = db.prepare(`SELECT user_id FROM ca_payment_secrets WHERE user_id = ?`).get(USER_ID)
    return !!row
  }

  setPaymentPassword(password: string): void {
    if (!/^\d{6}$/.test(password)) {
      throw new Error('支付密码须为 6 位数字')
    }
    const db = this.requireDb()
    const hash = hashPaymentPassword(password)
    db.prepare(
      `INSERT INTO ca_payment_secrets (user_id, password_hash, fail_count, locked_until)
       VALUES (?, ?, 0, NULL)
       ON CONFLICT(user_id) DO UPDATE SET password_hash = excluded.password_hash, fail_count = 0, locked_until = NULL`
    ).run(USER_ID, hash)
  }

  private assertPaymentPassword(password: string): void {
    const db = this.requireDb()
    const row = db
      .prepare(`SELECT password_hash, fail_count, locked_until FROM ca_payment_secrets WHERE user_id = ?`)
      .get(USER_ID) as
      | { password_hash: string; fail_count: number; locked_until: string | null }
      | undefined
    if (!row) throw new Error('请先设置支付密码')
    if (row.locked_until) {
      const until = new Date(row.locked_until).getTime()
      if (Date.now() < until) {
        throw new Error('支付密码已锁定，请稍后再试')
      }
      db.prepare(`UPDATE ca_payment_secrets SET fail_count = 0, locked_until = NULL WHERE user_id = ?`).run(
        USER_ID
      )
    }
    if (!verifyPaymentPassword(password, row.password_hash)) {
      const fails = row.fail_count + 1
      let lockedUntil: string | null = null
      if (fails >= MAX_PAYMENT_FAILS) {
        lockedUntil = new Date(Date.now() + PAYMENT_LOCK_MS).toISOString()
      }
      db.prepare(
        `UPDATE ca_payment_secrets SET fail_count = ?, locked_until = ? WHERE user_id = ?`
      ).run(fails, lockedUntil, USER_ID)
      if (lockedUntil) throw new Error('密码错误次数过多，已锁定 5 分钟')
      throw new Error(`支付密码错误（还可尝试 ${MAX_PAYMENT_FAILS - fails} 次）`)
    }
    db.prepare(`UPDATE ca_payment_secrets SET fail_count = 0, locked_until = NULL WHERE user_id = ?`).run(
      USER_ID
    )
  }

  checkout(input: CaCheckoutInput): CaOrder {
    this.assertPaymentPassword(input.password)
    const db = this.requireDb()
    const products: CaProduct[] = []
    let totalCents = 0

    for (const pid of input.productIds) {
      const p = this.getProduct(pid)
      if (!p) throw new Error(`商品不存在: ${pid}`)
      if (p.metadata?.residence) throw new Error(`${p.name} 为系统展示用房，不可购买`)
      if (p.priceCents <= 0 && p.category !== 'ILLUSTRATION') {
        throw new Error(`${p.name} 不可购买`)
      }
      if (this.isProductOwned(pid)) throw new Error(`已拥有: ${p.name}`)
      const { level } = this.syncUserProgress()
      const limits = getLevelLimits(level)
      if (p.category === 'VEHICLE') {
        const count = db
          .prepare(
            `SELECT COUNT(*) AS c FROM ca_inventory_items i JOIN ca_products p ON p.id = i.product_id
             WHERE i.user_id = ? AND p.category = 'VEHICLE'`
          )
          .get(USER_ID) as { c: number }
        if (count.c >= limits.vehicles) throw new Error(`车辆持有上限为 ${limits.vehicles} 辆`)
      }
      products.push(p)
      totalCents += p.priceCents
    }

    const balance = this.getBalanceCents()
    if (balance < totalCents) {
      throw new Error('余额不足')
    }

    const card = db
      .prepare(`SELECT id FROM ca_virtual_cards WHERE id = ? AND user_id = ?`)
      .get(input.cardId, USER_ID)
    if (!card) throw new Error('银行卡无效')

    const orderId = randomUUID()
    const now = new Date().toISOString()
    const items = products.map((p) => ({
      productId: p.id,
      name: p.name,
      priceCents: p.priceCents,
      quantity: 1
    }))

    const tx = db.transaction(() => {
      const wallet = db
        .prepare(`SELECT balance_cents FROM ca_wallets WHERE user_id = ?`)
        .get(USER_ID) as { balance_cents: number }
      const newBalance = wallet.balance_cents - totalCents
      db.prepare(`UPDATE ca_wallets SET balance_cents = ?, updated_at = ? WHERE user_id = ?`).run(
        newBalance,
        now,
        USER_ID
      )
      db.prepare(
        `INSERT INTO ca_ledger_entries (
          id, user_id, type, amount_cents, balance_after_cents, ref_type, ref_id, note, created_at
        ) VALUES (?, ?, 'purchase', ?, ?, 'order', ?, ?, ?)`
      ).run(
        randomUUID(),
        USER_ID,
        -totalCents,
        newBalance,
        orderId,
        `购买 ${products.map((p) => p.name).join('、')}`,
        now
      )
      db.prepare(
        `INSERT INTO ca_orders (id, user_id, total_cents, status, items_json, card_id, paid_at)
         VALUES (?, ?, ?, 'paid', ?, ?, ?)`
      ).run(orderId, USER_ID, totalCents, JSON.stringify(items), input.cardId, now)

      for (const p of products) {
        const invId = randomUUID()
        db.prepare(
          `INSERT INTO ca_inventory_items (id, user_id, product_id, integrity, state, life_json, acquired_at)
           VALUES (?, ?, ?, 100, 'normal', NULL, ?)`
        ).run(invId, USER_ID, p.id, now)
      }
    })
    tx()
    this.syncUserProgress()

    return {
      id: orderId,
      totalCents,
      status: 'paid',
      items,
      cardId: input.cardId,
      paidAt: now
    }
  }

  listTodos(): CaTodo[] {
    const db = this.requireDb()
    const rows = db
      .prepare(
        `SELECT id, title, description, priority, due_date, reward_cents, source, status, completed_at, created_at
         FROM ca_todos WHERE user_id = ? ORDER BY
           CASE status WHEN 'pending' THEN 0 ELSE 1 END,
           CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
           created_at DESC`
      )
      .all(USER_ID) as Array<{
      id: string
      title: string
      description: string | null
      priority: string
      due_date: string | null
      reward_cents: number
      source: string
      status: string
      completed_at: string | null
      created_at: string
    }>
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      priority: r.priority as CaTodo['priority'],
      dueDate: r.due_date,
      rewardCents: r.reward_cents,
      source: r.source as CaTodo['source'],
      status: r.status as CaTodo['status'],
      completedAt: r.completed_at,
      createdAt: r.created_at
    }))
  }

  ensureDailyTodos(): void {
    const db = this.requireDb()
    const today = todayDateKey()
    const meta = db.prepare(`SELECT value FROM ca_meta WHERE key = 'daily_todos_date'`).get() as
      | { value: string }
      | undefined
    if (meta?.value === today) return

    const shuffled = [...SYSTEM_TODO_POOL].sort(() => Math.random() - 0.5)
    const pick = shuffled.slice(0, 4 + Math.floor(Math.random() * 2))
    const now = new Date().toISOString()
    const insert = db.prepare(
      `INSERT INTO ca_todos (
        id, user_id, title, description, priority, due_date, reward_cents, source, status, completed_at, created_at
      ) VALUES (?, ?, ?, ?, ?, NULL, ?, 'system', 'pending', NULL, ?)`
    )
    for (const t of pick) {
      insert.run(randomUUID(), USER_ID, t.title, t.description, t.priority, t.rewardCents, now)
    }
    db.prepare(
      `INSERT INTO ca_meta (key, value) VALUES ('daily_todos_date', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(today)
  }

  createUserTodo(input: {
    title: string
    description?: string
    priority: CaTodo['priority']
    dueDate?: string | null
    rewardCents: number
  }): CaTodo {
    const db = this.requireDb()
    const { level } = this.syncUserProgress()
    const limits = getLevelLimits(level)
    const count = db
      .prepare(
        `SELECT COUNT(*) AS c FROM ca_todos WHERE user_id = ? AND source = 'user' AND status = 'pending'`
      )
      .get(USER_ID) as { c: number }
    if (count.c >= limits.todoMax) {
      throw new Error(`自定义待办上限为 ${limits.todoMax} 条`)
    }
    const id = randomUUID()
    const now = new Date().toISOString()
    const reward = Math.min(Math.max(input.rewardCents, 10), 5000)
    db.prepare(
      `INSERT INTO ca_todos (
        id, user_id, title, description, priority, due_date, reward_cents, source, status, completed_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'user', 'pending', NULL, ?)`
    ).run(
      id,
      USER_ID,
      input.title.trim(),
      input.description?.trim() ?? null,
      input.priority,
      input.dueDate ?? null,
      reward,
      now
    )
    return {
      id,
      title: input.title.trim(),
      description: input.description?.trim() ?? null,
      priority: input.priority,
      dueDate: input.dueDate ?? null,
      rewardCents: reward,
      source: 'user',
      status: 'pending',
      completedAt: null,
      createdAt: now
    }
  }

  completeTodo(todoId: string): { todo: CaTodo; balanceCents: number } {
    const db = this.requireDb()
    const row = db
      .prepare(`SELECT * FROM ca_todos WHERE id = ? AND user_id = ?`)
      .get(todoId, USER_ID) as {
      id: string
      title: string
      description: string | null
      priority: string
      due_date: string | null
      reward_cents: number
      source: string
      status: string
      completed_at: string | null
      created_at: string
    } | undefined
    if (!row) throw new Error('任务不存在')
    if (row.status !== 'pending') throw new Error('任务已完成或已过期')

    const now = new Date().toISOString()
    db.prepare(`UPDATE ca_todos SET status = 'completed', completed_at = ? WHERE id = ?`).run(now, todoId)
    const balance = this.credit(row.reward_cents, 'todo_reward', 'todo', todoId, `完成任务：${row.title}`)

    const todo: CaTodo = {
      id: row.id,
      title: row.title,
      description: row.description,
      priority: row.priority as CaTodo['priority'],
      dueDate: row.due_date,
      rewardCents: row.reward_cents,
      source: row.source as CaTodo['source'],
      status: 'completed',
      completedAt: now,
      createdAt: row.created_at
    }
    return { todo, balanceCents: balance }
  }

  listTools(): CaToolManifest[] {
    return TOOL_MANIFEST
  }

  getToolRewardStatus(toolId: string): CaToolRewardStatus {
    const manifest = getToolManifest(toolId)
    if (!manifest) throw new Error('未知工具')
    const db = this.requireDb()
    const today = todayDateKey()
    const row = db
      .prepare(
        `SELECT count FROM ca_tool_reward_logs WHERE user_id = ? AND tool_id = ? AND log_date = ?`
      )
      .get(USER_ID, toolId, today) as { count: number } | undefined
    const usedToday = row?.count ?? 0
    return {
      toolId,
      usedToday,
      dailyLimit: manifest.dailyRewardLimit,
      canReward: usedToday < manifest.dailyRewardLimit
    }
  }

  async invokeTool(toolId: string): Promise<CaToolInvokeResult> {
    const manifest = getToolManifest(toolId)
    if (!manifest) throw new Error('未知工具')

    let content = ''
    if (toolId === 'joke') content = await fetchJoke()
    else if (toolId === 'riddle') content = randomRiddle()
    else if (toolId === 'kana') content = fetchKanaLesson()
    else if (toolId === 'daily-poem') content = await fetchDailyPoem()
    else if (toolId === 'word') content = await fetchWord()
    else if (toolId === 'pandoc') {
      content = '文档转换需在本机安装 Pandoc，将在后续版本提供完整转换流程。今日仍可浏览说明并获得有限奖励。'
    } else {
      content = await fetchHitokoto()
    }

    const status = this.getToolRewardStatus(toolId)
    const { level } = this.syncUserProgress()
    let rewarded = false
    let rewardCents = 0

    if (status.canReward) {
      rewardCents = toolRewardCents(toolId, level)
      this.credit(rewardCents, 'tool_reward', 'tool', toolId, `使用工具：${manifest.name}`)
      rewarded = true
      const db = this.requireDb()
      const today = todayDateKey()
      db.prepare(
        `INSERT INTO ca_tool_reward_logs (user_id, tool_id, log_date, count)
         VALUES (?, ?, ?, 1)
         ON CONFLICT(user_id, tool_id, log_date) DO UPDATE SET count = count + 1`
      ).run(USER_ID, toolId, today)
    }

    return { content, rewarded, rewardCents }
  }

  saveVehicleCustomization(slug: string, lifeJson: Record<string, unknown>): void {
    const db = this.requireDb()
    const row = db
      .prepare(
        `SELECT i.id FROM ca_inventory_items i
         JOIN ca_products p ON p.id = i.product_id
         WHERE i.user_id = ? AND p.model_3d_slug = ?`
      )
      .get(USER_ID, slug) as { id: string } | undefined
    if (!row) return
    db.prepare(`UPDATE ca_inventory_items SET life_json = ? WHERE id = ?`).run(
      JSON.stringify(lifeJson),
      row.id
    )
  }

  getVehicleCustomization(slug: string): Record<string, unknown> | null {
    const db = this.requireDb()
    const row = db
      .prepare(
        `SELECT i.life_json FROM ca_inventory_items i
         JOIN ca_products p ON p.id = i.product_id
         WHERE i.user_id = ? AND p.model_3d_slug = ?`
      )
      .get(USER_ID, slug) as { life_json: string | null } | undefined
    if (!row?.life_json) return null
    return JSON.parse(row.life_json) as Record<string, unknown>
  }
}
