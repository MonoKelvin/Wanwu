<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { CaProduct, ProductCategory } from '@shared/types/cloud-abode'
import { CATEGORY_LABELS, formatCny } from '@modules/cloud-abode/shared/formatMoney'
import {
  categoryVisual,
  cloudAbodeProductImageUrl
} from '@modules/cloud-abode/shared/productVisual'
import PaymentModal from '@modules/cloud-abode/components/PaymentModal.vue'
import CaPageLayout from '@modules/cloud-abode/components/CaPageLayout.vue'
import '@modules/cloud-abode/styles/cloud-abode-product-detail.css'

defineOptions({ name: 'MallDetailView' })

const CATEGORY_QUOTES: Record<ProductCategory, string> = {
  VEHICLE: '速度是语言，线条是句子——一辆好车，应像建筑一样安静而笃定。',
  FURNITURE: '家具不是填充空间的物件，而是日常生活的骨架与节奏。',
  PLANT: '一株绿植，让房间有了呼吸，也让时间变得可见。',
  PET: '陪伴无需喧哗，目光与习惯，便是最温柔的契约。',
  ILLUSTRATION: '图像留住某一瞬的光，也留住当时的心情。',
  OTHER: '好的设计，让人忘记设计本身，只记住生活应有的样子。'
}

type PdpSlide = { id: string; kind: 'image' | 'glyph' | 'studio'; src?: string; caption?: string }

const route = useRoute()
const router = useRouter()
const product = ref<CaProduct | null>(null)
const owned = ref(false)
const balanceCents = ref(0)
const payOpen = ref(false)
const loading = ref(true)
const slideIndex = ref(0)
const quantity = ref(1)

const productId = computed(() => route.params.productId as string)

const canBuy = computed(() => {
  if (!product.value || owned.value) return false
  if (product.value.metadata?.residence) return false
  if (product.value.category === 'ILLUSTRATION') return true
  return product.value.priceCents > 0
})

const visual = computed(() =>
  product.value ? categoryVisual(product.value.category) : categoryVisual('OTHER')
)

const imageUrl = computed(() =>
  product.value ? cloudAbodeProductImageUrl(product.value.imagePath) : null
)

const titleParts = computed(() => {
  const p = product.value
  if (!p) return { lead: '', tail: '', kind: '' }
  const skuParts = p.sku.split('-').filter(Boolean)
  const lead = (skuParts[0] ?? p.category).toUpperCase()
  const tail = (skuParts[1] ?? '').toUpperCase()
  const kind = CATEGORY_LABELS[p.category] ?? p.category
  return { lead, tail, kind }
})

const launchedYear = computed(() => {
  const raw = product.value?.createdAt
  if (!raw) return '—'
  const y = new Date(raw).getFullYear()
  return Number.isFinite(y) ? String(y) : '—'
})

const quoteText = computed(() => {
  const cat = product.value?.category ?? 'OTHER'
  return CATEGORY_QUOTES[cat as ProductCategory] ?? CATEGORY_QUOTES.OTHER
})

const slides = computed((): PdpSlide[] => {
  const p = product.value
  if (!p) return []
  const list: PdpSlide[] = []
  if (imageUrl.value) {
    list.push({ id: 'main', kind: 'image', src: imageUrl.value })
  }
  list.push({ id: 'glyph', kind: 'glyph', caption: visual.value.label })
  if (p.model3dSlug) {
    list.push({ id: 'studio', kind: 'studio', caption: '3D 展车' })
  }
  return list
})

const slideCount = computed(() => slides.value.length)
const currentSlide = computed(() => slides.value[slideIndex.value] ?? slides.value[0])
const thumbSlide = computed(() => {
  const next = (slideIndex.value + 1) % Math.max(slideCount.value, 1)
  return slides.value[next]
})

const indexLabel = computed(() => {
  const total = String(slideCount.value).padStart(2, '0')
  const cur = String(slideIndex.value + 1).padStart(2, '0')
  return { cur, total }
})

function goSlide(delta: number) {
  const n = slideCount.value
  if (n <= 1) return
  slideIndex.value = (slideIndex.value + delta + n) % n
}

function bumpQty(delta: number) {
  quantity.value = Math.max(1, Math.min(1, quantity.value + delta))
}

async function load() {
  loading.value = true
  try {
    product.value = await window.wanwu.cloudAbode.getProduct(productId.value)
    owned.value = await window.wanwu.cloudAbode.isProductOwned(productId.value)
    const dash = await window.wanwu.cloudAbode.getDashboard()
    balanceCents.value = dash?.balanceCents ?? 0
    slideIndex.value = 0
  } finally {
    loading.value = false
  }
}

function onPaid() {
  owned.value = true
  void load()
}

watch(productId, () => void load())
onMounted(() => void load())
</script>

<template>
  <CaPageLayout wide>
    <div v-if="loading" class="ww-ca-loading">加载中…</div>

    <article v-else-if="product" class="ww-ca-pdp" :style="{ '--ww-ca-cat-hue': visual.hue }">
      <button type="button" class="ww-ca-pdp__back" @click="router.push('/cloud-abode/mall')">
        ← 返回商城
      </button>

      <div class="ww-ca-pdp__grid">
        <!-- 左栏：标题 / 描述 / 参数 / 购买 -->
        <div class="ww-ca-pdp__info">
          <p class="ww-ca-pdp__series">{{ CATEGORY_LABELS[product.category] }}</p>
          <h1 class="ww-ca-pdp__title">
            <span>{{ titleParts.lead }}</span>
            <span v-if="titleParts.tail" class="ww-ca-pdp__title-light"> / {{ titleParts.tail }}</span>
            <span class="ww-ca-pdp__title-kind"> — {{ product.name }}</span>
          </h1>

          <p class="ww-ca-pdp__label">描述</p>
          <p class="ww-ca-pdp__desc">
            {{ product.description || '精选好物，品质与定价贴近真实生活。' }}
          </p>

          <dl class="ww-ca-pdp__facts">
            <div class="ww-ca-pdp__fact">
              <dt>分类</dt>
              <dd>{{ CATEGORY_LABELS[product.category] }}</dd>
            </div>
            <div class="ww-ca-pdp__fact">
              <dt>编号</dt>
              <dd>{{ product.sku }}</dd>
            </div>
            <div class="ww-ca-pdp__fact">
              <dt>上架</dt>
              <dd>{{ launchedYear }}</dd>
            </div>
            <div class="ww-ca-pdp__fact">
              <dt>系列</dt>
              <dd>{{ product.subCategory || visual.label }}</dd>
            </div>
          </dl>

          <div class="ww-ca-pdp__links">
            <button type="button" class="ww-ca-pdp__link" @click="router.push('/cloud-abode/wallet')">
              账户余额
            </button>
            <span class="ww-ca-pdp__link-sep">/</span>
            <button
              v-if="product.model3dSlug"
              type="button"
              class="ww-ca-pdp__link"
              @click="
                router.push({
                  name: 'cloud-abode-showroom',
                  params: { slug: product.model3dSlug }
                })
              "
            >
              3D 展车
            </button>
            <template v-if="product.model3dSlug">
              <span class="ww-ca-pdp__link-sep">/</span>
            </template>
            <button type="button" class="ww-ca-pdp__link" @click="router.push('/cloud-abode/inventory')">
              我的收藏
            </button>
          </div>

          <div class="ww-ca-pdp__purchase">
            <p class="ww-ca-pdp__price-label">价格</p>
            <div class="ww-ca-pdp__price-row">
              <p class="ww-ca-pdp__price">¥ {{ formatCny(product.priceCents) }}</p>
              <div class="ww-ca-pdp__qty" aria-label="数量">
                <button
                  type="button"
                  class="ww-ca-pdp__qty-btn"
                  disabled
                  aria-label="减少"
                  @click="bumpQty(-1)"
                >
                  −
                </button>
                <span class="ww-ca-pdp__qty-val">{{ quantity }}</span>
                <button
                  type="button"
                  class="ww-ca-pdp__qty-btn"
                  disabled
                  aria-label="增加"
                  @click="bumpQty(1)"
                >
                  +
                </button>
              </div>
            </div>
            <button
              v-if="canBuy"
              type="button"
              class="ww-ca-pdp__buy"
              @click="payOpen = true"
            >
              立即购买
            </button>
            <span v-else-if="owned" class="ww-ca-pdp__owned">已在收藏中</span>
            <button v-else type="button" class="ww-ca-pdp__buy" disabled>
              不可购买
            </button>
            <p class="ww-ca-pdp__balance">账户余额 ¥{{ formatCny(balanceCents) }}</p>
          </div>
        </div>

        <!-- 中央主图 -->
        <div class="ww-ca-pdp__stage" aria-live="polite">
          <img
            v-if="currentSlide?.kind === 'image' && currentSlide.src"
            :src="currentSlide.src"
            :alt="product.name"
            class="ww-ca-pdp__stage-img"
          />
          <span
            v-else-if="currentSlide?.kind === 'studio'"
            class="ww-ca-pdp__stage-glyph"
            aria-hidden="true"
          >
            3D
          </span>
          <span v-else class="ww-ca-pdp__stage-glyph" aria-hidden="true">{{ visual.glyph }}</span>
        </div>

        <!-- 右侧：引言 / 缩略图 / 翻页 -->
        <aside class="ww-ca-pdp__aside">
          <blockquote class="ww-ca-pdp__quote">
            <span class="ww-ca-pdp__quote-mark" aria-hidden="true">"</span>
            <p class="ww-ca-pdp__quote-text">{{ quoteText }}</p>
          </blockquote>

          <div v-if="thumbSlide" class="ww-ca-pdp__thumb" aria-hidden="true">
            <img
              v-if="thumbSlide.kind === 'image' && thumbSlide.src"
              :src="thumbSlide.src"
              alt=""
              class="ww-ca-pdp__thumb-img"
            />
            <span v-else class="ww-ca-pdp__thumb-glyph">
              {{ thumbSlide.kind === 'studio' ? '3D' : visual.glyph }}
            </span>
          </div>

          <div class="ww-ca-pdp__nav">
            <p class="ww-ca-pdp__index">
              <span class="ww-ca-pdp__index-current">{{ indexLabel.cur }}</span>
              / {{ indexLabel.total }}
            </p>
            <div class="ww-ca-pdp__arrows">
              <button
                type="button"
                class="ww-ca-pdp__arrow"
                :disabled="slideCount <= 1"
                @click="goSlide(1)"
              >
                <span class="ww-ca-pdp__arrow-icon" aria-hidden="true">→</span>
                下一张
              </button>
              <button
                type="button"
                class="ww-ca-pdp__arrow"
                :disabled="slideCount <= 1"
                @click="goSlide(-1)"
              >
                <span class="ww-ca-pdp__arrow-icon" aria-hidden="true">←</span>
                上一张
              </button>
            </div>
          </div>
        </aside>
      </div>
    </article>

    <PaymentModal
      v-if="product"
      :open="payOpen"
      :product="product"
      :balance-cents="balanceCents"
      @close="payOpen = false"
      @success="onPaid"
    />
  </CaPageLayout>
</template>
