<script setup lang="ts">
import { computed } from 'vue'
import type { MusicTrackBadge, NormalizedTrack } from '@modules/music/domain/types'

const props = defineProps<{
  track: Pick<NormalizedTrack, 'badges' | 'isTrial'>
  compact?: boolean
}>()

const LABEL: Record<MusicTrackBadge, string> = {
  vip: 'VIP',
  trial: '试听',
  hires: 'Hi-Res',
  lossless: '无损',
  paid: '数字专辑'
}

const items = computed(() => {
  const set = new Set<MusicTrackBadge>(props.track.badges ?? [])
  if (props.track.isTrial) set.add('trial')
  const order: MusicTrackBadge[] = ['trial', 'vip', 'paid', 'hires', 'lossless']
  return order.filter((k) => set.has(k))
})
</script>

<template>
  <span v-if="items.length" class="ww-track-badges" :class="{ 'ww-track-badges--compact': compact }">
    <span
      v-for="badge in items"
      :key="badge"
      class="ww-track-badges__pill"
      :class="`is-${badge}`"
    >
      {{ LABEL[badge] }}
    </span>
  </span>
</template>

<style scoped>
.ww-track-badges {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
}

.ww-track-badges--compact .ww-track-badges__pill {
  font-size: 0.5625rem;
  padding: 0.05rem 0.3rem;
}

.ww-track-badges__pill {
  display: inline-flex;
  align-items: center;
  padding: 0.08rem 0.35rem;
  border-radius: 0.25rem;
  font-size: 0.625rem;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.02em;
  border: 1px solid transparent;
}

.ww-track-badges__pill.is-vip {
  color: #c9a227;
  background: color-mix(in srgb, #c9a227 12%, transparent);
  border-color: color-mix(in srgb, #c9a227 28%, transparent);
}

.ww-track-badges__pill.is-trial {
  color: var(--ww-ink-muted);
  background: color-mix(in srgb, var(--ww-ink) 6%, transparent);
  border-color: color-mix(in srgb, var(--ww-ink) 12%, transparent);
}

.ww-track-badges__pill.is-hires {
  color: #7c5cff;
  background: color-mix(in srgb, #7c5cff 10%, transparent);
  border-color: color-mix(in srgb, #7c5cff 24%, transparent);
}

.ww-track-badges__pill.is-lossless {
  color: #2a9d8f;
  background: color-mix(in srgb, #2a9d8f 10%, transparent);
  border-color: color-mix(in srgb, #2a9d8f 24%, transparent);
}

.ww-track-badges__pill.is-paid {
  color: var(--ww-accent);
  background: color-mix(in srgb, var(--ww-accent) 10%, transparent);
  border-color: color-mix(in srgb, var(--ww-accent) 22%, transparent);
}
</style>
