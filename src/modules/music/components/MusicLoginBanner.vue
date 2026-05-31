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
    <WwIcon name="user-circle" size="sm" class="ww-music-login-banner__icon" />
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

<style scoped>
.ww-music-login-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  margin-bottom: var(--ww-music-section-gap, 1.25rem);
  border-radius: var(--ww-music-inner-radius, 0.875rem);
  border: 1px solid var(--ww-glass-border);
  background: var(--ww-music-glass-panel, color-mix(in srgb, var(--ww-glass-bg-soft) 72%, var(--ww-content)));
}

.ww-music-login-banner__icon {
  flex-shrink: 0;
  color: var(--ww-ink-faint);
}

.ww-music-login-banner__body {
  flex: 1;
  min-width: 0;
}

.ww-music-login-banner__title {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ww-ink);
}

.ww-music-login-banner__desc {
  margin: 0.2rem 0 0;
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--ww-ink-muted);
}
</style>
