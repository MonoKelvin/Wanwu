<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { CaTodo } from '@shared/types/cloud-abode'
import { formatCny } from '@modules/cloud-abode/shared/formatMoney'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import CaPageLayout from '@modules/cloud-abode/components/CaPageLayout.vue'
import CaPageTitle from '@modules/cloud-abode/components/CaPageTitle.vue'
import CaBtn from '@modules/cloud-abode/components/CaBtn.vue'
import CaField from '@modules/cloud-abode/components/CaField.vue'
import CaReveal from '@modules/cloud-abode/components/CaReveal.vue'

defineOptions({ name: 'TodoView' })

const toast = useWanwuToast()
const todos = ref<CaTodo[]>([])
const loading = ref(true)
const newTitle = ref('')
const newReward = ref(200)

async function load() {
  loading.value = true
  try {
    await window.wanwu.cloudAbode.ensureDailyTodos()
    todos.value = await window.wanwu.cloudAbode.listTodos()
  } finally {
    loading.value = false
  }
}

async function complete(id: string) {
  try {
    const { balanceCents } = await window.wanwu.cloudAbode.completeTodo(id)
    toast.success(`任务完成，余额 ¥${formatCny(balanceCents)}`)
    await load()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '失败')
  }
}

async function createUser() {
  if (!newTitle.value.trim()) return
  try {
    await window.wanwu.cloudAbode.createUserTodo({
      title: newTitle.value.trim(),
      priority: 'medium',
      rewardCents: newReward.value
    })
    newTitle.value = ''
    toast.success('已添加')
    await load()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '失败')
  }
}

onMounted(() => void load())
</script>

<template>
  <CaPageLayout>
    <CaPageTitle title="任务" lead="完成待办，赚取零钱" />

    <div class="ww-ca-inline-form">
      <CaField v-model="newTitle" grow placeholder="新任务" />
      <CaField v-model="newReward" type="number" width="5rem" :min="10" :max="5000" />
      <CaBtn variant="primary" @click="createUser">添加</CaBtn>
    </div>

    <div v-if="loading" class="ww-ca-loading">加载中</div>
    <CaReveal v-else>
      <ul class="ww-ca-list ww-ca-stagger">
        <li
          v-for="t in todos"
          :key="t.id"
          class="ww-ca-row"
          :class="{ 'ww-ca-row--done': t.status !== 'pending' }"
        >
          <div class="ww-ca-row__main">
            <p class="ww-ca-row__title">{{ t.title }}</p>
            <p class="ww-ca-row__sub">
              {{ t.source === 'system' ? '系统' : '自定义' }}
              · +¥{{ formatCny(t.rewardCents) }}
            </p>
          </div>
          <CaBtn
            v-if="t.status === 'pending'"
            variant="secondary"
            class="shrink-0"
            @click="complete(t.id)"
          >
            完成
          </CaBtn>
          <span v-else class="ww-ca-pill shrink-0">已完成</span>
        </li>
      </ul>
    </CaReveal>
  </CaPageLayout>
</template>
