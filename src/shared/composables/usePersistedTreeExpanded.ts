import { ref, watch } from 'vue'
import type { TreeNode } from 'primevue/treenode'
import { collectExpandableKeys } from '@modules/library/core/utils/treeKeys'

function readStorage(key: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, boolean>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStorage(key: string, value: Record<string, boolean>) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

/** 目录树展开状态持久化；默认全部收起，搜索时临时展开匹配分支 */
export function usePersistedTreeExpanded(storageKey: string) {
  const expandedKeys = ref<Record<string, boolean>>(readStorage(storageKey))

  let writeTimer: ReturnType<typeof setTimeout> | null = null

  watch(
    expandedKeys,
    (keys) => {
      if (writeTimer) clearTimeout(writeTimer)
      writeTimer = setTimeout(() => {
        writeStorage(storageKey, keys)
        writeTimer = null
      }, 120)
    },
    { deep: true }
  )

  function expandForSearch(nodes: TreeNode[]) {
    if (!nodes.length) return
    expandedKeys.value = { ...expandedKeys.value, ...collectExpandableKeys(nodes) }
  }

  function mergeExpandedKeys(keys: Record<string, boolean>) {
    expandedKeys.value = { ...expandedKeys.value, ...keys }
  }

  return { expandedKeys, expandForSearch, mergeExpandedKeys }
}
