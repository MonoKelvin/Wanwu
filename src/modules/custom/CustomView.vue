<script setup lang="ts">
import { ref } from 'vue'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'

const categoryName = ref('')
const duplicateHint = ref('')

async function checkName() {
  if (!categoryName.value.trim()) return
  const result = await window.wanwu.custom.checkDuplicate(categoryName.value.trim())
  if (result.duplicate) {
    duplicateHint.value = `「${categoryName.value}」已存在于全库，建议使用全库分类浏览。`
  } else {
    duplicateHint.value = '分类名可用（创建功能将在后续版本完善）'
  }
}
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <header class="border-b border-ww-border px-6 py-4">
      <h1 class="text-lg font-medium">自建</h1>
      <p class="text-xs text-ww-muted">创建个人专题，支持自定义字段（v1.0 基础框架）</p>
    </header>

    <div class="max-w-md flex-1 overflow-y-auto p-6">
      <label class="mb-2 block text-xs text-ww-muted">新建分类名称</label>
      <div class="flex gap-2">
        <InputText v-model="categoryName" class="flex-1" placeholder="输入分类名" />
        <Button label="检查重名" size="small" @click="checkName" />
      </div>
      <p v-if="duplicateHint" class="mt-3 text-xs" :class="duplicateHint.includes('全库') ? 'text-amber-700' : 'text-ww-muted'">
        {{ duplicateHint }}
      </p>
    </div>
  </div>
</template>
