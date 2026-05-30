import { readonly, ref } from 'vue'
import { useWanwuToast } from '@shared/composables/useWanwuToast'

/** 复制类操作的默认顶部轻提示文案 */
export const POP_TIP_COPY_MESSAGES = {
  link: '已复制链接',
  imageLink: '已复制图片链接',
  image: '已复制图片',
  detail: '已复制详情',
  id: '已复制 ID'
} as const

/** @deprecated 使用 POP_TIP_COPY_MESSAGES */
export const COPY_SUCCESS_MESSAGES = POP_TIP_COPY_MESSAGES

const DEFAULT_LIFE_MS = 2400

const message = ref('')
let hideTimer: ReturnType<typeof setTimeout> | null = null

function clearHideTimer() {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

/** 显示顶部居中胶囊轻提示 */
export function showPopTip(text: string, lifeMs = DEFAULT_LIFE_MS) {
  message.value = text
  clearHideTimer()
  hideTimer = setTimeout(() => {
    message.value = ''
    hideTimer = null
  }, lifeMs)
}

/** @deprecated 使用 showPopTip */
export const showCopySuccessToast = showPopTip

/** 供 WwPopTipHost 绑定 */
export function usePopTipMessage() {
  return readonly(message)
}

export function usePopTip() {
  const wanwuToast = useWanwuToast()

  async function copyText(
    text: string,
    successMessage: string = POP_TIP_COPY_MESSAGES.detail
  ): Promise<boolean> {
    const value = text?.trim()
    if (!value) return false
    try {
      await window.wanwu.shell.copyText(value)
      showPopTip(successMessage)
      return true
    } catch (e) {
      wanwuToast.error(
        e instanceof Error ? e.message : '无法写入剪贴板',
        '复制失败'
      )
      return false
    }
  }

  async function copyLink(url: string): Promise<boolean> {
    return copyText(url, POP_TIP_COPY_MESSAGES.link)
  }

  return {
    show: showPopTip,
    copyText,
    copyLink
  }
}

/** @deprecated 使用 usePopTip */
export const useCopySuccessToast = usePopTip

/** @deprecated 使用 usePopTipMessage */
export const useCopySuccessToastMessage = usePopTipMessage
