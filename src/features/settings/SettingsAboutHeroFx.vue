<script setup lang="ts">
import { computed, onMounted, toRef, watch } from 'vue'
import { useAboutHeroFx } from '@features/settings/useAboutHeroFx'
import './about-hero-fx.css'

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
