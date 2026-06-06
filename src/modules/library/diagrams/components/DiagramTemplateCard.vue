<script setup lang="ts">
import WwIcon from '@shared/components/WwIcon.vue'

defineProps<{
  name: string
  variant: 'blank' | 'flow' | 'decision' | 'steps' | 'org' | 'uml' | 'arch'
}>()

defineEmits<{ click: [] }>()
</script>

<template>
  <button type="button" class="dg-type-card" @click="$emit('click')">
    <span class="dg-type-card__art" aria-hidden="true">
      <!-- 空白文档 -->
      <svg v-if="variant === 'blank'" class="dg-type-card__svg" viewBox="0 0 120 100" fill="none">
        <rect x="32" y="14" width="56" height="72" rx="7" stroke="currentColor" stroke-width="1.8" opacity="0.22" />
        <path d="M60 36v24M47 48h26" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" opacity="0.4" />
      </svg>

      <!-- 业务流程图 -->
      <svg v-else-if="variant === 'flow'" class="dg-type-card__svg" viewBox="0 0 120 100" fill="none">
        <rect x="8" y="38" width="24" height="26" rx="12" stroke="currentColor" stroke-width="1.7" opacity="0.42" />
        <rect x="44" y="38" width="32" height="26" rx="5" stroke="currentColor" stroke-width="1.7" opacity="0.36" />
        <rect x="88" y="38" width="24" height="26" rx="12" stroke="currentColor" stroke-width="1.7" opacity="0.3" />
        <path
          d="M32 51h12M76 51h12"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          opacity="0.32"
        />
        <path d="M44 51h4l2-2 2 2M88 51h-4l-2-2-2 2" stroke="currentColor" stroke-width="1.6" opacity="0.28" />
      </svg>

      <!-- 程序逻辑图 -->
      <svg v-else-if="variant === 'decision'" class="dg-type-card__svg" viewBox="0 0 120 100" fill="none">
        <rect x="44" y="8" width="32" height="18" rx="4" stroke="currentColor" stroke-width="1.7" opacity="0.34" />
        <path d="M60 26v8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.3" />
        <path
          d="M60 34 L80 54 L60 74 L40 54 Z"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linejoin="round"
          opacity="0.4"
        />
        <path d="M48 58 L24 58v16h22V58" stroke="currentColor" stroke-width="1.6" opacity="0.28" />
        <path d="M72 58 L96 58v16H74V58" stroke="currentColor" stroke-width="1.6" opacity="0.28" />
        <rect x="16" y="74" width="34" height="16" rx="4" stroke="currentColor" stroke-width="1.6" opacity="0.24" />
        <rect x="70" y="74" width="34" height="16" rx="4" stroke="currentColor" stroke-width="1.6" opacity="0.24" />
      </svg>

      <!-- 工作流程图（泳道） -->
      <svg v-else-if="variant === 'steps'" class="dg-type-card__svg" viewBox="0 0 120 100" fill="none">
        <path d="M10 28h100M10 52h100M10 76h100" stroke="currentColor" stroke-width="1.4" opacity="0.18" />
        <rect x="14" y="18" width="28" height="16" rx="4" stroke="currentColor" stroke-width="1.7" opacity="0.34" />
        <rect x="48" y="42" width="28" height="16" rx="4" stroke="currentColor" stroke-width="1.7" opacity="0.3" />
        <rect x="78" y="66" width="28" height="16" rx="4" stroke="currentColor" stroke-width="1.7" opacity="0.26" />
        <path
          d="M42 26 L48 42M76 50 L78 66"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          opacity="0.26"
        />
        <path d="M42 26h6M76 50h2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.22" />
      </svg>

      <!-- UML 类图 -->
      <svg v-else-if="variant === 'uml'" class="dg-type-card__svg" viewBox="0 0 120 100" fill="none">
        <rect x="14" y="12" width="38" height="32" rx="2" stroke="currentColor" stroke-width="1.6" opacity="0.36" />
        <path d="M14 22 H52" stroke="currentColor" stroke-width="1.4" opacity="0.28" />
        <rect x="68" y="12" width="38" height="32" rx="2" stroke="currentColor" stroke-width="1.6" opacity="0.3" />
        <path d="M68 20 H106" stroke="currentColor" stroke-width="1.4" opacity="0.24" />
        <rect x="40" y="56" width="40" height="32" rx="2" stroke="currentColor" stroke-width="1.6" opacity="0.34" />
        <path d="M40 66 H80" stroke="currentColor" stroke-width="1.4" opacity="0.26" />
        <path d="M52 44 L60 56 M80 44 L60 56" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.22" />
      </svg>

      <!-- 系统架构图 -->
      <svg v-else-if="variant === 'arch'" class="dg-type-card__svg" viewBox="0 0 120 100" fill="none">
        <path
          d="M42 14 A8 5 0 0 1 54 10 A10 6 0 0 1 72 12 A8 5 0 0 1 78 18 H42 A8 5 0 0 1 42 14 Z"
          stroke="currentColor"
          stroke-width="1.6"
          opacity="0.34"
        />
        <rect x="22" y="42" width="30" height="18" rx="4" stroke="currentColor" stroke-width="1.6" opacity="0.3" />
        <rect x="68" y="42" width="30" height="18" rx="4" stroke="currentColor" stroke-width="1.6" opacity="0.28" />
        <path d="M60 24 L37 42 M60 24 L83 42" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.24" />
        <path d="M5 8 A7 2 0 0 1 19 8 V16 A7 2 0 0 1 5 16 Z M5 8 A7 2 0 0 0 19 8" stroke="currentColor" stroke-width="1.5" opacity="0.26" transform="translate(48 58) scale(1.4)" />
        <path d="M37 60 L54 72 M83 60 L66 72" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity="0.2" />
      </svg>

      <!-- 组织架构图 -->
      <svg v-else class="dg-type-card__svg" viewBox="0 0 120 100" fill="none">
        <rect x="42" y="8" width="36" height="18" rx="4" stroke="currentColor" stroke-width="1.7" opacity="0.38" />
        <path d="M60 26v10M30 36h60" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.28" />
        <path d="M30 36v8M60 36v8M90 36v8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" opacity="0.26" />
        <rect x="16" y="44" width="28" height="16" rx="4" stroke="currentColor" stroke-width="1.6" opacity="0.3" />
        <rect x="46" y="44" width="28" height="16" rx="4" stroke="currentColor" stroke-width="1.6" opacity="0.28" />
        <rect x="76" y="44" width="28" height="16" rx="4" stroke="currentColor" stroke-width="1.6" opacity="0.26" />
        <path d="M30 60v8M90 60v8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.22" />
        <rect x="8" y="68" width="24" height="14" rx="3" stroke="currentColor" stroke-width="1.5" opacity="0.2" />
        <rect x="88" y="68" width="24" height="14" rx="3" stroke="currentColor" stroke-width="1.5" opacity="0.2" />
      </svg>
    </span>

    <span v-if="variant === 'blank'" class="dg-type-card__plus" aria-hidden="true">
      <WwIcon name="plus" size="md" />
    </span>

    <span class="dg-type-card__name">{{ name }}</span>
  </button>
</template>
