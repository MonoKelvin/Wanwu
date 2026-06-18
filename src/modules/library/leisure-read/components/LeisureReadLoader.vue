<script setup lang="ts">
withDefaults(
  defineProps<{
    /** 覆盖在已有内容之上，不遮挡操作栏 */
    overlay?: boolean
  }>(),
  { overlay: false }
)
</script>

<template>
  <div
    class="lr-loader"
    :class="{ 'lr-loader--overlay': overlay }"
    role="status"
    aria-live="polite"
    aria-label="加载中"
  >
    <div class="lr-loader__stage" aria-hidden="true">
      <svg class="lr-loader__svg" viewBox="0 0 200 200" fill="none">
        <defs>
          <radialGradient id="lr-bh-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="var(--lr-loader-core)" stop-opacity="1" />
            <stop offset="42%" stop-color="var(--lr-loader-accent)" stop-opacity="0.85" />
            <stop offset="100%" stop-color="var(--lr-loader-accent)" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="lr-disk-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="var(--lr-loader-accent)" stop-opacity="0" />
            <stop offset="50%" stop-color="var(--lr-loader-accent)" stop-opacity="0.35" />
            <stop offset="100%" stop-color="var(--lr-loader-accent)" stop-opacity="0" />
          </radialGradient>
        </defs>

        <!-- 吸积盘弥散光 -->
        <ellipse
          class="lr-loader__disk lr-loader__disk--outer"
          cx="100"
          cy="100"
          rx="78"
          ry="22"
        />
        <ellipse
          class="lr-loader__disk lr-loader__disk--inner"
          cx="100"
          cy="100"
          rx="58"
          ry="14"
        />

        <!-- 多维轨道 -->
        <g class="lr-loader__orbit lr-loader__orbit--a">
          <ellipse cx="100" cy="100" rx="62" ry="62" class="lr-loader__path" />
          <circle class="lr-loader__electron" cx="100" cy="38" r="3.5" />
        </g>
        <g class="lr-loader__orbit lr-loader__orbit--b">
          <ellipse cx="100" cy="100" rx="48" ry="48" class="lr-loader__path" />
          <circle class="lr-loader__electron" cx="148" cy="100" r="3" />
        </g>
        <g class="lr-loader__orbit lr-loader__orbit--c">
          <ellipse cx="100" cy="100" rx="72" ry="72" class="lr-loader__path" />
          <circle class="lr-loader__electron" cx="100" cy="172" r="2.8" />
        </g>

        <!-- 黑洞核心 -->
        <circle class="lr-loader__horizon" cx="100" cy="100" r="26" fill="url(#lr-bh-glow)" />
        <circle class="lr-loader__singularity" cx="100" cy="100" r="9" />
        <circle class="lr-loader__photon" cx="100" cy="100" r="14" />
      </svg>
    </div>
  </div>
</template>
