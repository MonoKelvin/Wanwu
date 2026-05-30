<script setup lang="ts">
defineOptions({ name: 'CaEditorialStrip' })

const items = [
  '跑车与展车',
  '家居陈设',
  '绿植与宠物',
  '立绘收藏',
  '日常任务',
  '生活工具',
  '账本与消费',
  '云斋生活'
]
</script>

<template>
  <div class="ww-ca-editorial-strip" aria-label="云斋生活品类">
    <div class="ww-ca-editorial-strip__track">
      <span v-for="(label, i) in items" :key="`a-${i}`" class="ww-ca-editorial-strip__item">
        {{ label }}
      </span>
      <span v-for="(label, i) in items" :key="`b-${i}`" class="ww-ca-editorial-strip__item" aria-hidden="true">
        {{ label }}
      </span>
    </div>
  </div>
</template>
