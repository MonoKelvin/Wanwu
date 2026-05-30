import { computed, ref, type MaybeRefOrGetter, toValue } from 'vue'

/** 仅在文本被截断时展示 tooltip */
export function useOverflowTooltip(text: MaybeRefOrGetter<string>) {
  const el = ref<HTMLElement | null>(null)
  const overflow = ref(false)

  function checkOverflow() {
    const node = el.value
    overflow.value = !!node && node.scrollWidth > node.clientWidth + 1
  }

  const tooltip = computed(() =>
    overflow.value
      ? {
          value: toValue(text),
          class: 'ww-tooltip-text-wrap',
          fitContent: true,
          showDelay: 320
        }
      : undefined
  )

  return { el, overflow, checkOverflow, tooltip }
}
