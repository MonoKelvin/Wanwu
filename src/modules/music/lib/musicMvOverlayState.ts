import { ref } from 'vue'

/** MV 全屏页激活时隐藏底栏（轻量状态，避免 AppShell 拉取音乐 store） */
export const mvPageActive = ref(false)
