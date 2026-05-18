<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import InputText from 'primevue/inputtext'
import WwButton from '@shared/components/WwButton.vue'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import { useCustomStore } from '@shared/stores/custom'
import PageHeader from '@app/components/PageHeader.vue'
import EmptyState from '@app/components/EmptyState.vue'
import ItemCard from '@features/item/ItemCard.vue'

const route = useRoute()
const customStore = useCustomStore()

const categoryName = ref('')
const duplicateHint = ref('')
const isWarning = ref(false)

watch(
  () => route.params.catId,
  async (catId) => {
    if (typeof catId === 'string') await customStore.loadItems(catId)
  },
  { immediate: true }
)

async function checkName() {
  if (!categoryName.value.trim()) return
  const result = await window.wanwu.custom.checkDuplicate(categoryName.value.trim())
  if (result.duplicate) {
    duplicateHint.value = `「${categoryName.value}」已在全库中存在`
    isWarning.value = true
  } else {
    duplicateHint.value = '名称可用（创建功能待完善）'
    isWarning.value = false
  }
}
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <PageHeader title="自建" subtitle="个人专题" />

    <div v-if="!route.params.catId" class="ww-scroll-main flex items-center justify-center">
      <div class="w-full max-w-md rounded-xl border border-[rgb(18_18_22/0.08)] bg-ww-content/80 p-6 backdrop-blur-md">
        <label for="cat-name" class="text-xs text-ww-ink-muted">分类名</label>
        <div class="mt-2 flex gap-2">
          <InputText id="cat-name" v-model="categoryName" class="flex-1" placeholder="植物图鉴" />
          <WwButton label="检查" icon="search" size="small" @click="checkName" />
        </div>
        <Message v-if="duplicateHint" :severity="isWarning ? 'warn' : 'success'" :closable="false" class="mt-3 text-sm">
          {{ duplicateHint }}
        </Message>
      </div>
    </div>

    <template v-else>
      <div v-if="customStore.loading" class="ww-scroll-main">
        <Skeleton height="11rem" class="!rounded-lg !bg-ww-panel" />
      </div>
      <EmptyState
        v-else-if="customStore.items.length === 0"
        title="分类为空"
        description="该自建分类下还没有物品。"
      />
      <div v-else class="ww-scroll-main">
        <div class="grid grid-cols-12 gap-3">
          <div
            v-for="item in customStore.items"
            :key="item.id"
            class="col-span-12 sm:col-span-6 lg:col-span-4"
          >
            <ItemCard :item="item" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
