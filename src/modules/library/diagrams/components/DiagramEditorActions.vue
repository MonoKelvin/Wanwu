<script setup lang="ts">
import { useToast } from 'primevue/usetoast'
import WwButton from '@shared/components/WwButton.vue'
import { useDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'

const bus = useDiagramCommandBus()
const toast = useToast()

async function save() {
  const result = await bus.dispatch({ type: 'document.save' })
  if (result.ok) {
    toast.add({ severity: 'success', summary: '已保存', life: 2000 })
  } else {
    toast.add({ severity: 'error', summary: '保存失败', detail: result.message, life: 4000 })
  }
}

async function exportPng() {
  const result = await bus.dispatch({ type: 'document.export', payload: { format: 'png' } })
  if (!result.ok || !result.data) {
    toast.add({
      severity: 'error',
      summary: '导出失败',
      detail: result.ok ? undefined : result.message,
      life: 4000
    })
    return
  }
  const blob = (result.data as { blob: Blob }).blob
  const dataUrl = await blobToDataUrl(blob)
  const saved = await window.wanwu.shell.savePngDataUrl({
    dataUrl,
    defaultName: '流程图.png'
  })
  if (saved.ok && saved.path) {
    toast.add({ severity: 'success', summary: '已导出 PNG', life: 2500 })
  }
}

async function exportSvg() {
  const result = await bus.dispatch({ type: 'document.export', payload: { format: 'svg' } })
  if (!result.ok || !result.data) {
    toast.add({
      severity: 'error',
      summary: '导出失败',
      detail: result.ok ? undefined : result.message,
      life: 4000
    })
    return
  }
  const svg = (result.data as { svg: string }).svg
  const saved = await window.wanwu.shell.saveTextFile({
    content: svg,
    defaultName: '流程图.svg',
    extension: 'svg'
  })
  if (saved.ok && saved.path) {
    toast.add({ severity: 'success', summary: '已导出 SVG', life: 2500 })
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
</script>

<template>
  <div class="dg-action-dock ww-glass-blur" role="toolbar" aria-label="文档操作">
    <WwButton label="保存" icon="save" size="small" @click="save" />
    <span class="dg-action-dock__sep" aria-hidden="true" />
    <WwButton
      icon="image"
      size="small"
      severity="secondary"
      text
      rounded
      aria-label="导出 PNG"
      v-tooltip.bottom="'导出 PNG'"
      @click="exportPng"
    />
    <WwButton
      icon="download"
      size="small"
      severity="secondary"
      text
      rounded
      aria-label="导出 SVG"
      v-tooltip.bottom="'导出 SVG'"
      @click="exportSvg"
    />
  </div>
</template>
