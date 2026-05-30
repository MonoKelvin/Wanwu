<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { CaToolManifest, CaToolRewardStatus } from '@shared/types/cloud-abode'
import { formatCny } from '@modules/cloud-abode/shared/formatMoney'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import CaPageLayout from '@modules/cloud-abode/components/CaPageLayout.vue'
import CaPageTitle from '@modules/cloud-abode/components/CaPageTitle.vue'
import CaReveal from '@modules/cloud-abode/components/CaReveal.vue'

defineOptions({ name: 'ToolsView' })

const toast = useWanwuToast()
const tools = ref<CaToolManifest[]>([])
const statuses = ref<Record<string, CaToolRewardStatus>>({})
const activeId = ref<string | null>(null)
const content = ref('')
const loading = ref(false)

async function load() {
  tools.value = await window.wanwu.cloudAbode.listTools()
  const map: Record<string, CaToolRewardStatus> = {}
  for (const t of tools.value) {
    map[t.id] = await window.wanwu.cloudAbode.getToolRewardStatus(t.id)
  }
  statuses.value = map
}

async function invoke(toolId: string) {
  activeId.value = toolId
  loading.value = true
  content.value = ''
  try {
    const res = await window.wanwu.cloudAbode.invokeTool(toolId)
    content.value = res.content
    if (res.rewarded) {
      toast.success(`获得 ¥${formatCny(res.rewardCents)} 奖励`)
    } else {
      toast.info('今日奖励次数已用完')
    }
    statuses.value[toolId] = await window.wanwu.cloudAbode.getToolRewardStatus(toolId)
  } catch (e) {
    toast.error(e instanceof Error ? e.message : '调用失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => void load())
</script>

<template>
  <CaPageLayout>
    <CaPageTitle title="工具" lead="轻量工具 · 赚取零钱" />

    <CaReveal>
      <div class="ww-ca-tool-grid ww-ca-stagger">
        <button
          v-for="t in tools"
          :key="t.id"
          type="button"
          class="ww-ca-tool"
          :class="{ 'ww-ca-tool--active': activeId === t.id }"
          @click="invoke(t.id)"
        >
          <span class="ww-ca-tool__name">{{ t.name }}</span>
          <span class="ww-ca-tool__desc">{{ t.description }}</span>
          <span class="ww-ca-tool__meta">
            {{ statuses[t.id]?.usedToday ?? 0 }}/{{ statuses[t.id]?.dailyLimit ?? '—' }}
          </span>
        </button>
      </div>
    </CaReveal>

    <div v-if="loading" class="ww-ca-loading">处理中</div>
    <pre v-else-if="content" class="ww-ca-output">{{ content }}</pre>
  </CaPageLayout>
</template>
