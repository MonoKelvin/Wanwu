<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CaProduct, CaVirtualCard } from '@shared/types/cloud-abode'
import { formatCny } from '@modules/cloud-abode/shared/formatMoney'
import { useWanwuToast } from '@shared/composables/useWanwuToast'

const props = defineProps<{
  open: boolean
  product: CaProduct | null
  balanceCents: number
}>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const toast = useWanwuToast()
const cards = ref<CaVirtualCard[]>([])
const selectedCardId = ref('')
const password = ref('')
const loading = ref(false)
const hasPassword = ref(true)
const newPassword = ref('')
const newPasswordConfirm = ref('')
const setupMode = ref(false)

const canAfford = computed(() =>
  props.product ? props.balanceCents >= props.product.priceCents : false
)

async function loadCards() {
  cards.value = await window.wanwu.cloudAbode.listCards()
  const def = cards.value.find((c) => c.isDefault)
  selectedCardId.value = def?.id ?? cards.value[0]?.id ?? ''
  hasPassword.value = await window.wanwu.cloudAbode.hasPaymentPassword()
  setupMode.value = !hasPassword.value
}

watch(
  () => props.open,
  (v) => {
    if (v) {
      password.value = ''
      newPassword.value = ''
      newPasswordConfirm.value = ''
      void loadCards()
    }
  }
)

async function savePassword() {
  if (newPassword.value !== newPasswordConfirm.value) {
    toast.error('两次密码不一致')
    return
  }
  try {
    await window.wanwu.cloudAbode.setPaymentPassword(newPassword.value)
    setupMode.value = false
    hasPassword.value = true
    toast.success('支付密码已设置')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '设置失败')
  }
}

async function pay() {
  if (!props.product) return
  if (!canAfford.value) {
    toast.error('余额不足')
    return
  }
  if (!selectedCardId.value) {
    toast.error('请先在账本页添加银行卡')
    return
  }
  loading.value = true
  try {
    await window.wanwu.cloudAbode.checkout({
      productIds: [props.product.id],
      cardId: selectedCardId.value,
      password: password.value
    })
    toast.success('购买成功')
    emit('success')
    emit('close')
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '支付失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open && product" class="ww-ca-pay-overlay ww-ca-web" @click.self="emit('close')">
      <div class="ww-ca-pay-modal" role="dialog" aria-labelledby="ca-pay-title">
        <h2 id="ca-pay-title" class="ww-ca-pay-modal__title">确认购买</h2>
        <p class="ww-ca-pay-modal__meta">{{ product.name }}</p>
        <p class="ww-ca-pay-modal__price">¥{{ formatCny(product.priceCents) }}</p>
        <p class="ww-ca-pay-modal__meta">账户余额 ¥{{ formatCny(balanceCents) }}</p>

        <div v-if="setupMode" class="ww-ca-pay-modal__field">
          <p class="ww-ca-page__lead">首次购买请设置 6 位支付密码</p>
          <label class="ww-ca-pay-modal__label">支付密码</label>
          <input
            v-model="newPassword"
            type="password"
            maxlength="6"
            inputmode="numeric"
            class="ww-ca-field w-full"
          />
          <label class="ww-ca-pay-modal__label mt-2">再次输入</label>
          <input
            v-model="newPasswordConfirm"
            type="password"
            maxlength="6"
            inputmode="numeric"
            class="ww-ca-field w-full"
          />
          <div class="ww-ca-pay-modal__actions">
            <button type="button" class="ww-ca-btn ww-ca-btn--primary w-full" @click="savePassword">
              保存密码
            </button>
          </div>
        </div>

        <template v-else>
          <div class="ww-ca-pay-modal__field">
            <label class="ww-ca-pay-modal__label">支付卡</label>
            <select v-model="selectedCardId" class="ww-ca-field w-full">
              <option v-for="c in cards" :key="c.id" :value="c.id">
                {{ c.alias }} ({{ c.maskedNumber }})
              </option>
            </select>
            <p v-if="cards.length === 0" class="ww-ca-pay-modal__warn">
              请先在账本页添加银行卡
            </p>
          </div>
          <div class="ww-ca-pay-modal__field">
            <label class="ww-ca-pay-modal__label">支付密码</label>
            <input
              v-model="password"
              type="password"
              maxlength="6"
              inputmode="numeric"
              class="ww-ca-field w-full"
              placeholder="6 位数字"
            />
          </div>
          <div class="ww-ca-pay-modal__actions">
            <button type="button" class="ww-ca-btn" @click="emit('close')">取消</button>
            <button
              type="button"
              class="ww-ca-btn ww-ca-btn--primary"
              :disabled="loading || !canAfford"
              @click="pay"
            >
              {{ loading ? '处理中…' : '确认支付' }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>
