<script setup lang="ts">
import Button from 'primevue/button'
import IconField from 'primevue/iconfield'
import InputText from 'primevue/inputtext'
import SelectButton from 'primevue/selectbutton'
import WwInputIcon from '@shared/components/WwInputIcon.vue'

export type LinksViewMode = 'list' | 'card'

const search = defineModel<string>('search', { default: '' })
const viewMode = defineModel<LinksViewMode>('viewMode', { default: 'list' })

defineProps<{
  syncing?: boolean
  folderLabel?: string
}>()

const emit = defineEmits<{
  sync: []
  add: []
  filterUnreachable: []
  sort: []
  batch: []
}>()

const viewOptions = [
  { label: '列表', value: 'list' },
  { label: '卡片', value: 'card' }
]
</script>

<template>
  <div class="ww-links-toolbar flex flex-wrap items-center gap-2">
    <IconField class="ww-field-search min-w-[12rem] flex-1">
      <WwInputIcon name="search" />
      <InputText v-model="search" placeholder="搜索链接…" class="w-full" aria-label="搜索链接" />
    </IconField>

    <SelectButton v-model="viewMode" :options="viewOptions" option-label="label" option-value="value" />

    <Button
      label="同步"
      icon="pi pi-refresh"
      severity="secondary"
      size="small"
      :loading="syncing"
      @click="emit('sync')"
    />
    <Button label="新增" icon="pi pi-plus" size="small" @click="emit('add')" />
    <Button
      label="批量"
      icon="pi pi-list-check"
      severity="secondary"
      size="small"
      outlined
      @click="emit('batch')"
    />
    <Button
      label="排序"
      icon="pi pi-sort-alt"
      severity="secondary"
      size="small"
      outlined
      @click="emit('sort')"
    />
    <Button
      label="过滤无效"
      icon="pi pi-filter"
      severity="secondary"
      size="small"
      outlined
      @click="emit('filterUnreachable')"
    />
  </div>
</template>
