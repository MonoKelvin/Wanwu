import { onBeforeUnmount, onMounted, readonly, ref, type DeepReadonly, type Ref } from 'vue'

let subscribers = 0
let timer: ReturnType<typeof setInterval> | null = null
const sharedNow = ref(Date.now())

/** 全应用共享的分钟级时间戳，避免多处 setInterval */
export function useMinuteClock(): DeepReadonly<Ref<number>> {
  onMounted(() => {
    subscribers += 1
    if (subscribers === 1) {
      timer = setInterval(() => {
        sharedNow.value = Date.now()
      }, 60_000)
    }
  })

  onBeforeUnmount(() => {
    subscribers = Math.max(0, subscribers - 1)
    if (subscribers === 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  })

  return readonly(sharedNow)
}
