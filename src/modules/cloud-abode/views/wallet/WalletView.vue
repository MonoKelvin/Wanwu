<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { CaLedgerEntry, CaVirtualCard } from '@shared/types/cloud-abode'
import { formatCny, LEDGER_TYPE_LABELS } from '@modules/cloud-abode/shared/formatMoney'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import CaPageLayout from '@modules/cloud-abode/components/CaPageLayout.vue'
import CaPageTitle from '@modules/cloud-abode/components/CaPageTitle.vue'
import CaBtn from '@modules/cloud-abode/components/CaBtn.vue'
import CaField from '@modules/cloud-abode/components/CaField.vue'
import CaReveal from '@modules/cloud-abode/components/CaReveal.vue'

defineOptions({ name: 'WalletView' })

const toast = useWanwuToast()
const balanceCents = ref(0)
const ledger = ref<CaLedgerEntry[]>([])
const cards = ref<CaVirtualCard[]>([])
const loading = ref(true)
const newCardNumber = ref('')
const newCardAlias = ref('')
const pwd = ref('')
const pwdConfirm = ref('')

async function load() {
  loading.value = true
  try {
    const dash = await window.wanwu.cloudAbode.getDashboard()
    balanceCents.value = dash?.balanceCents ?? 0
    ledger.value = await window.wanwu.cloudAbode.listLedger(80)
    cards.value = await window.wanwu.cloudAbode.listCards()
  } finally {
    loading.value = false
  }
}

async function addCard() {
  try {
    await window.wanwu.cloudAbode.addCard({
      cardNumber: newCardNumber.value,
      alias: newCardAlias.value
    })
    newCardNumber.value = ''
    toast.success('银行卡已添加')
    await load()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '添加失败')
  }
}

async function setPassword() {
  if (pwd.value !== pwdConfirm.value) {
    toast.error('两次密码不一致')
    return
  }
  try {
    await window.wanwu.cloudAbode.setPaymentPassword(pwd.value)
    pwd.value = ''
    pwdConfirm.value = ''
    toast.success('支付密码已更新')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '设置失败')
  }
}

function ledgerLabel(type: string): string {
  return LEDGER_TYPE_LABELS[type] ?? type
}

onMounted(() => void load())
</script>

<template>
  <CaPageLayout>
    <CaPageTitle title="账本" lead="余额 · 绑卡 · 收支" />

    <CaReveal>
      <div class="ww-ca-stat-strip ww-ca-stat-strip--solo">
        <div class="ww-ca-stat-strip__item">
          <p class="ww-ca-stat-strip__label">可用余额</p>
          <p class="ww-ca-stat-strip__value ww-ca-stat-strip__value--hero">
            ¥{{ formatCny(balanceCents) }}
          </p>
        </div>
      </div>
    </CaReveal>

    <CaReveal>
      <section class="ww-ca-minimal-section">
        <div class="ww-ca-minimal-section__head">
          <h2 class="ww-ca-minimal-section__title">银行卡</h2>
        </div>
        <ul v-if="cards.length" class="ww-ca-list">
          <li v-for="c in cards" :key="c.id" class="ww-ca-row">
            <div class="ww-ca-row__main">
              <p class="ww-ca-row__title">{{ c.alias }}</p>
              <p class="ww-ca-row__sub">{{ c.maskedNumber }}</p>
            </div>
            <span v-if="c.isDefault" class="ww-ca-pill">默认</span>
          </li>
        </ul>
        <div class="ww-ca-inline-form" :class="{ 'mt-3': cards.length }">
          <CaField v-model="newCardNumber" grow placeholder="卡号" />
          <CaField v-model="newCardAlias" placeholder="别名" />
          <CaBtn variant="secondary" @click="addCard">添加</CaBtn>
        </div>
      </section>
    </CaReveal>

    <CaReveal>
      <section class="ww-ca-minimal-section">
        <div class="ww-ca-minimal-section__head">
          <h2 class="ww-ca-minimal-section__title">支付密码</h2>
        </div>
        <div class="ww-ca-inline-form">
          <CaField v-model="pwd" type="password" :maxlength="6" placeholder="新密码" />
          <CaField v-model="pwdConfirm" type="password" :maxlength="6" placeholder="确认" />
          <CaBtn variant="secondary" @click="setPassword">保存</CaBtn>
        </div>
      </section>
    </CaReveal>

    <CaReveal>
      <section class="ww-ca-minimal-section">
        <div class="ww-ca-minimal-section__head">
          <h2 class="ww-ca-minimal-section__title">收支明细</h2>
        </div>
        <div v-if="loading" class="ww-ca-loading">加载中</div>
        <ul v-else class="ww-ca-list ww-ca-stagger">
          <li v-for="e in ledger" :key="e.id" class="ww-ca-row">
            <div class="ww-ca-row__main">
              <p class="ww-ca-row__title">{{ ledgerLabel(e.type) }}</p>
              <p v-if="e.note" class="ww-ca-row__sub">{{ e.note }}</p>
            </div>
            <span
              class="ww-ca-pill"
              :class="e.amountCents >= 0 ? 'ww-ca-pill--credit' : 'ww-ca-pill--debit'"
            >
              {{ e.amountCents >= 0 ? '+' : '−' }}¥{{ formatCny(Math.abs(e.amountCents)) }}
            </span>
          </li>
        </ul>
      </section>
    </CaReveal>
  </CaPageLayout>
</template>
