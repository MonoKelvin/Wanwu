<script setup lang="ts">
import WwButton from '@shared/components/WwButton.vue'
import WwIcon from '@shared/components/WwIcon.vue'

defineProps<{
  platformLabel?: string
  title?: string
  description?: string
}>()

const emit = defineEmits<{ login: [] }>()
</script>

<template>
  <div class="ww-music-login-banner">
    <WwIcon name="user" :size="32" class="ww-music-login-banner__icon" />
    <div class="ww-music-login-banner__body">
      <p class="ww-music-login-banner__title">
        {{ title ?? (platformLabel ? `登录${platformLabel}解锁更多` : '登录解锁更多') }}
      </p>
      <p class="ww-music-login-banner__desc">
        {{
          description ??
          (platformLabel
            ? `日推、私人 FM 等个性化内容需登录${platformLabel}账号。`
            : '个性化推荐需登录平台账号。')
        }}
      </p>
    </div>
    <WwButton label="登录" size="small" @click="emit('login')" />
  </div>
</template>
