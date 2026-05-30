import { ref } from 'vue'
import { useSettingsStore } from '@shared/stores/settings'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import { useWanwuConfirm } from '@shared/composables/useWanwuConfirm'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function useSettingsMaintenance() {
  const settingsStore = useSettingsStore()
  const toast = useWanwuToast()
  const confirm = useWanwuConfirm()
  const busy = ref(false)

  async function onCreateBackup() {
    if (busy.value) return
    busy.value = true
    try {
      const result = await window.wanwu.app.createBackup()
      if (!result.ok) {
        if ('canceled' in result && result.canceled) return
        toast.error(result.error ?? '备份失败')
        return
      }
      toast.success(`备份完成（${formatBytes(result.bytes)}）`, '备份完成', {
        action: toast.revealInFolderAction(result.path)
      })
    } finally {
      busy.value = false
    }
  }

  async function onRestoreBackup() {
    const ok = await confirm.ask({
      header: '从备份恢复',
      message: '将使用所选 zip 覆盖当前数据目录，应用会重启。请确认已备份当前数据。',
      acceptLabel: '选择备份并恢复',
      rejectLabel: '取消',
      danger: true
    })
    if (!ok || busy.value) return
    busy.value = true
    try {
      const result = await window.wanwu.app.restoreBackup()
      if (!result.ok) {
        if ('canceled' in result && result.canceled) return
        toast.error(result.error ?? '恢复失败')
      }
    } finally {
      busy.value = false
    }
  }

  async function onClearCache() {
    const ok = await confirm.ask({
      header: '清除缓存',
      message: '将删除数据目录下的 cache 文件夹内容（如 RSS 缩略图缓存），不会删除数据库与媒体文件。',
      acceptLabel: '清除',
      rejectLabel: '取消',
      danger: true
    })
    if (!ok || busy.value) return
    busy.value = true
    try {
      await window.wanwu.app.clearCache()
    } finally {
      busy.value = false
    }
  }

  async function onResetSettings() {
    const ok = await confirm.ask({
      header: '重置所有设置',
      message: '将恢复应用、RSS 等设置为默认值，并清除全库列表视图偏好。不会删除你的条目与收藏数据。',
      acceptLabel: '重置',
      rejectLabel: '取消',
      danger: true
    })
    if (!ok || busy.value) return
    busy.value = true
    try {
      await settingsStore.resetAll()
      toast.success('设置已恢复默认')
    } finally {
      busy.value = false
    }
  }

  async function onExportDiagnostics() {
    if (busy.value) return
    busy.value = true
    try {
      const result = await window.wanwu.app.exportDiagnostics()
      if (!result.ok) {
        if ('canceled' in result && result.canceled) return
        toast.error(result.error ?? '导出失败')
      }
    } finally {
      busy.value = false
    }
  }

  return {
    busy,
    onCreateBackup,
    onRestoreBackup,
    onClearCache,
    onResetSettings,
    onExportDiagnostics
  }
}
