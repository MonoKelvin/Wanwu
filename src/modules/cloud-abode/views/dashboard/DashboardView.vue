<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { CaDashboard, ProductCategory } from '@shared/types/cloud-abode'
import { formatCny } from '@modules/cloud-abode/shared/formatMoney'
import CaPageLayout from '@modules/cloud-abode/components/CaPageLayout.vue'
import CaCategoryTile from '@modules/cloud-abode/components/CaCategoryTile.vue'
import CaVelvetyHero from '@modules/cloud-abode/components/CaVelvetyHero.vue'
import CaBtn from '@modules/cloud-abode/components/CaBtn.vue'
import CaReveal from '@modules/cloud-abode/components/CaReveal.vue'

defineOptions({ name: 'DashboardView' })

const router = useRouter()
const dash = ref<CaDashboard | null>(null)
const loading = ref(true)

const mallCategories: Array<ProductCategory | ''> = [
  '',
  'VEHICLE',
  'FURNITURE',
  'PLANT',
  'PET',
  'ILLUSTRATION'
]

const todoCount = computed(() => dash.value?.activeTodos.length ?? 0)

async function load() {
  loading.value = true
  try {
    await window.wanwu.cloudAbode.ensureDailyTodos()
    dash.value = await window.wanwu.cloudAbode.getDashboard()
  } finally {
    loading.value = false
  }
}

function goMallCategory(cat: ProductCategory | '') {
  void router.push({
    path: '/cloud-abode/mall',
    query: cat ? { category: cat } : {}
  })
}

onMounted(() => void load())
</script>

<template>
  <CaPageLayout wide>
    <div v-if="loading" class="ww-ca-loading">加载中</div>
    <template v-else-if="dash">
      <CaVelvetyHero
        kicker="云斋"
        title="安顿生活"
        description="完成任务，赚取零钱；在商城选购跑车、家居与藏品。"
      >
        <template #actions>
          <CaBtn variant="primary" @click="router.push('/cloud-abode/mall')">探索商城</CaBtn>
          <CaBtn variant="text" @click="router.push('/cloud-abode/tools')">赚取零钱</CaBtn>
        </template>
      </CaVelvetyHero>

      <CaReveal>
        <div class="ww-ca-stat-strip">
          <div class="ww-ca-stat-strip__item">
            <p class="ww-ca-stat-strip__label">余额</p>
            <p class="ww-ca-stat-strip__value ww-ca-stat-strip__value--hero">
              ¥{{ formatCny(dash.balanceCents) }}
            </p>
          </div>
          <div class="ww-ca-stat-strip__item">
            <p class="ww-ca-stat-strip__label">待办</p>
            <p class="ww-ca-stat-strip__value">{{ todoCount }}</p>
          </div>
          <div class="ww-ca-stat-strip__item">
            <p class="ww-ca-stat-strip__label">等级</p>
            <p class="ww-ca-stat-strip__value">L{{ dash.level }}</p>
          </div>
        </div>
      </CaReveal>

      <CaReveal>
        <nav class="ww-ca-cat-grid" aria-label="商城分类">
          <CaCategoryTile
            v-for="cat in mallCategories"
            :key="cat || 'all'"
            :category="cat"
            @select="goMallCategory"
          />
        </nav>
      </CaReveal>

      <CaReveal v-if="dash.activeTodos.length">
        <section class="ww-ca-minimal-section">
          <div class="ww-ca-minimal-section__head">
            <h2 class="ww-ca-minimal-section__title">今日待办</h2>
            <button type="button" class="ww-ca-link" @click="router.push('/cloud-abode/todos')">
              全部
            </button>
          </div>
          <ul class="ww-ca-list">
            <li v-for="t in dash.activeTodos.slice(0, 4)" :key="t.id" class="ww-ca-row">
              <div class="ww-ca-row__main">
                <p class="ww-ca-row__title">{{ t.title }}</p>
              </div>
              <span class="ww-ca-pill">+¥{{ formatCny(t.rewardCents) }}</span>
            </li>
          </ul>
        </section>
      </CaReveal>

      <CaReveal v-if="dash.recentOrders.length">
        <section class="ww-ca-minimal-section">
          <div class="ww-ca-minimal-section__head">
            <h2 class="ww-ca-minimal-section__title">最近订单</h2>
            <button type="button" class="ww-ca-link" @click="router.push('/cloud-abode/inventory')">
              收藏
            </button>
          </div>
          <ul class="ww-ca-list">
            <li v-for="o in dash.recentOrders.slice(0, 3)" :key="o.id" class="ww-ca-row">
              <div class="ww-ca-row__main">
                <p class="ww-ca-row__title">{{ o.items.map((i) => i.name).join('、') }}</p>
              </div>
              <span class="ww-ca-pill">¥{{ formatCny(o.totalCents) }}</span>
            </li>
          </ul>
        </section>
      </CaReveal>
    </template>
  </CaPageLayout>
</template>
