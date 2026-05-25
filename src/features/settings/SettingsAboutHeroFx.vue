<script setup lang="ts">
import { computed, onMounted, toRef, watch } from 'vue'
import { useAboutHeroFx } from '@features/settings/useAboutHeroFx'

const props = withDefaults(
  defineProps<{
    active?: boolean
    visible?: boolean
  }>(),
  { active: false, visible: false }
)

const activeRef = toRef(props, 'active')
const visibleRef = toRef(props, 'visible')
const {
  particles,
  showFx,
  animTime,
  startLoop,
  particleStyle,
  ribbonWrapStyle,
  ribbonPathStyle,
  planeStyle,
  ribbons
} = useAboutHeroFx(activeRef, visibleRef)

const farRibbons = computed(() => ribbons.filter((r) => r.depth === 'far'))
const midRibbons = computed(() => ribbons.filter((r) => r.depth === 'mid'))
const nearRibbons = computed(() => ribbons.filter((r) => r.depth === 'near'))
const t = computed(() => animTime.value)

onMounted(() => {
  if (props.visible) startLoop()
})

watch(
  () => props.visible,
  (on) => {
    if (on) startLoop()
  }
)
</script>

<template>
  <div
    class="ww-about-hero-fx"
    :style="{ opacity: String(showFx) }"
    aria-hidden="true"
  >
    <div
      class="ww-about-hero-fx__plane ww-about-hero-fx__plane--far"
      :style="planeStyle('far', t)"
    >
      <span class="ww-about-hero-fx__halo ww-about-hero-fx__halo--1" />
      <span class="ww-about-hero-fx__halo ww-about-hero-fx__halo--2" />
      <svg
        class="ww-about-hero-fx__ribbons"
        viewBox="0 0 400 80"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <g v-for="r in farRibbons" :key="`far-${r.seed}`" :style="ribbonWrapStyle(r, t)">
          <path
            :d="r.d"
            class="ww-about-hero-fx__ribbon ww-about-hero-fx__ribbon--far"
            :class="`ww-about-hero-fx__ribbon--blur-${r.blur}`"
            :style="ribbonPathStyle(r, t)"
          />
        </g>
      </svg>
    </div>

    <div
      class="ww-about-hero-fx__plane ww-about-hero-fx__plane--mid"
      :style="planeStyle('mid', t)"
    >
      <span class="ww-about-hero-fx__halo ww-about-hero-fx__halo--3" />
      <svg
        class="ww-about-hero-fx__ribbons"
        viewBox="0 0 400 80"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <g v-for="r in midRibbons" :key="`mid-${r.seed}`" :style="ribbonWrapStyle(r, t)">
          <path
            :d="r.d"
            class="ww-about-hero-fx__ribbon ww-about-hero-fx__ribbon--mid"
            :class="`ww-about-hero-fx__ribbon--blur-${r.blur}`"
            :style="ribbonPathStyle(r, t)"
          />
        </g>
      </svg>
      <span
        v-for="p in particles.filter((x) => x.depthBand !== 'near')"
        :key="`pf-${p.seed}`"
        class="ww-about-hero-fx__particle"
        :class="`ww-about-hero-fx__particle--${p.depthBand}`"
        :style="particleStyle(p)"
      />
    </div>

    <div
      class="ww-about-hero-fx__plane ww-about-hero-fx__plane--near"
      :style="planeStyle('near', t)"
    >
      <svg
        class="ww-about-hero-fx__ribbons"
        viewBox="0 0 400 80"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <g v-for="r in nearRibbons" :key="`near-${r.seed}`" :style="ribbonWrapStyle(r, t)">
          <path
            :d="r.d"
            class="ww-about-hero-fx__ribbon ww-about-hero-fx__ribbon--near"
            :class="`ww-about-hero-fx__ribbon--blur-${r.blur}`"
            :style="ribbonPathStyle(r, t)"
          />
        </g>
      </svg>
      <span
        v-for="p in particles.filter((x) => x.depthBand === 'near')"
        :key="`pn-${p.seed}`"
        class="ww-about-hero-fx__particle ww-about-hero-fx__particle--near"
        :style="particleStyle(p)"
      />
    </div>

    <span class="ww-about-hero-fx__fog ww-about-hero-fx__fog--top" />
    <span class="ww-about-hero-fx__fog ww-about-hero-fx__fog--bottom" />
    <span class="ww-about-hero-fx__vignette" />
  </div>
</template>
<style>
/* 关于页 hero — CSS + JS 宇宙动效（hover 时由 JS rAF 驱动） */

/* 浅色主题：偏淡紫蓝，适配白底 hero */
.ww-settings-about-hero {
  --ww-about-fx-ribbon: rgb(136 128 186 / 0.42);
  --ww-about-fx-ribbon-soft: rgb(156 148 206 / 0.32);
  --ww-about-fx-ribbon-glow: rgb(172 166 220 / 0.3);
  --ww-about-fx-halo: rgb(162 154 212 / 0.24);
  --ww-about-fx-particle-far: rgb(168 162 208 / 0.44);
  --ww-about-fx-particle-mid: rgb(148 142 196 / 0.36);
  --ww-about-fx-particle-near: rgb(128 122 176 / 0.28);
  --ww-about-fx-fog: rgb(148 142 188 / 0.07);
}

[data-theme='dark'] .ww-settings-about-hero {
  --ww-about-fx-ribbon: rgb(150 162 215 / 0.34);
  --ww-about-fx-ribbon-soft: rgb(135 148 205 / 0.22);
  --ww-about-fx-ribbon-glow: rgb(145 158 215 / 0.14);
  --ww-about-fx-halo: rgb(105 118 185 / 0.34);
  --ww-about-fx-particle-far: rgb(105 118 188 / 0.6);
  --ww-about-fx-particle-mid: rgb(95 108 175 / 0.48);
  --ww-about-fx-particle-near: rgb(88 98 165 / 0.34);
  --ww-about-fx-fog: rgb(0 0 0 / 0.12);
}

.ww-about-hero-fx {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  transition: opacity 0.45s var(--ww-ease-out);
}

.ww-about-hero-fx__plane {
  position: absolute;
  inset: 0;
  transform-origin: center center;
  will-change: transform, opacity, filter;
  overflow: visible;
}

.ww-about-hero-fx__plane--far {
  z-index: 1;
}

.ww-about-hero-fx__plane--mid {
  z-index: 2;
}

.ww-about-hero-fx__plane--near {
  z-index: 3;
}

/* —— 光晕（CSS 辅助漂移） —— */
.ww-about-hero-fx__halo {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, var(--ww-about-fx-halo) 0%, transparent 68%);
  filter: blur(16px);
  opacity: 0.55;
}

.ww-about-hero-fx__halo--1 {
  width: 58%;
  height: 130%;
  left: 6%;
  top: -14%;
  animation: ww-about-halo-drift-a 36s var(--ww-ease-in-out) infinite;
}

.ww-about-hero-fx__halo--2 {
  width: 48%;
  height: 115%;
  right: 4%;
  top: -4%;
  animation: ww-about-halo-drift-b 30s var(--ww-ease-in-out) infinite;
  animation-delay: -7s;
}

.ww-about-hero-fx__halo--3 {
  width: 42%;
  height: 105%;
  left: 36%;
  bottom: -18%;
  animation: ww-about-halo-drift-c 32s var(--ww-ease-in-out) infinite;
  animation-delay: -12s;
  opacity: 0.45;
}

@keyframes ww-about-halo-drift-a {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  30% {
    transform: translate(3%, -4%) scale(1.05);
  }
  65% {
    transform: translate(-2%, 3%) scale(0.96);
  }
}

@keyframes ww-about-halo-drift-b {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  40% {
    transform: translate(-3%, 2%) scale(1.03);
  }
  70% {
    transform: translate(2%, -3%) scale(0.98);
  }
}

@keyframes ww-about-halo-drift-c {
  0%,
  100% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(1.5%, -2.5%) scale(1.04);
  }
}

/* —— 丝带 SVG（位移/对焦由 JS inline style 驱动） —— */
.ww-about-hero-fx__ribbons {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.ww-about-hero-fx__ribbons > g {
  transform-box: fill-box;
  transform-origin: center;
  will-change: transform;
}

.ww-about-hero-fx__ribbon {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
  will-change: opacity, filter;
}

.ww-about-hero-fx__ribbon--far {
  stroke: var(--ww-about-fx-ribbon-soft);
  stroke-width: 1.1;
}

.ww-about-hero-fx__ribbon--mid {
  stroke: var(--ww-about-fx-ribbon);
  stroke-width: 1.55;
}

.ww-about-hero-fx__ribbon--near {
  stroke: var(--ww-about-fx-ribbon-soft);
  stroke-width: 2.8;
}

/* 按单条丝带 blur 档位微调线宽（模糊大的略粗） */
.ww-about-hero-fx__ribbon--blur-glow.ww-about-hero-fx__ribbon--mid,
.ww-about-hero-fx__ribbon--blur-glow.ww-about-hero-fx__ribbon--far {
  stroke-width: 1.2;
}

.ww-about-hero-fx__ribbon--blur-heavy {
  stroke-width: 3.4;
}

/* —— 景深雾 / 暗角 —— */
.ww-about-hero-fx__fog {
  position: absolute;
  left: 0;
  right: 0;
  height: 38%;
  z-index: 4;
  pointer-events: none;
  background: linear-gradient(to bottom, var(--ww-about-fx-fog), transparent);
}

.ww-about-hero-fx__fog--top {
  top: 0;
}

.ww-about-hero-fx__fog--bottom {
  bottom: 0;
  transform: rotate(180deg);
}

.ww-about-hero-fx__vignette {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  background: radial-gradient(
    ellipse 85% 70% at 50% 50%,
    transparent 42%,
    rgb(128 122 168 / 0.05) 100%
  );
}

[data-theme='dark'] .ww-about-hero-fx__vignette {
  background: radial-gradient(
    ellipse 85% 70% at 50% 50%,
    transparent 35%,
    rgb(0 0 0 / 0.12) 100%
  );
}

/* —— 尘埃粒子（位置/缩放由 JS 每帧更新） —— */
.ww-about-hero-fx__particle {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  will-change: transform, opacity, filter, left, top;
}

.ww-about-hero-fx__particle--far {
  background: var(--ww-about-fx-particle-far);
}

.ww-about-hero-fx__particle--mid {
  background: var(--ww-about-fx-particle-mid);
}

.ww-about-hero-fx__particle--near {
  background: var(--ww-about-fx-particle-near);
}

@media (prefers-reduced-motion: reduce) {
  .ww-about-hero-fx__halo {
    animation: none !important;
  }
}
</style>
