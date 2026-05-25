<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@shared/stores/settings'
import { MODULE_NAV_ITEMS } from '@app/config/modules'
import { useModuleNavigation } from '@app/composables/useModuleNavigation'
import { useRouteModule } from '@app/composables/useRouteModule'
import WwIcon from '@shared/components/WwIcon.vue'
import { useAppLogo } from '@shared/composables/useAppLogo'
import type { ModuleId } from '@shared/stores/app'

const { nav: appLogoNav } = useAppLogo()
const routeModule = useRouteModule()
const { navigateToModule } = useModuleNavigation()
const { settings } = storeToRefs(useSettingsStore())

const modules = MODULE_NAV_ITEMS

const showLabel = computed(() => settings.value.navDisplay === 'both')
const useTooltip = computed(() => !showLabel.value)
const navAlignClass = computed(() =>
  settings.value.navAlign === 'center' ? 'ww-module-nav--center' : 'ww-module-nav--start'
)

function navigate(id: ModuleId) {
  navigateToModule(id)
}

function isActive(id: ModuleId) {
  return routeModule.value === id
}
</script>

<template>
  <nav
    class="ww-module-nav h-full shrink-0 bg-ww-rail"
    :class="navAlignClass"
    aria-label="模块"
  >
    <div class="ww-module-nav__inner ww-chrome-safe">
      <div class="ww-module-nav__brand" aria-hidden="true">
        <img
          class="ww-module-nav__brand-mark"
          :src="appLogoNav"
          width="32"
          height="32"
          alt=""
        />
        <span class="ww-module-nav__brand-text">万物</span>
      </div>

      <div class="ww-module-nav__group">
        <button
          v-for="m in modules"
          :key="m.id"
          v-tooltip.right="useTooltip ? m.label : undefined"
          type="button"
          class="ww-module-btn"
          :class="{
            'is-active': isActive(m.id),
            'ww-module-btn--labeled': showLabel
          }"
          :aria-label="m.label"
          :aria-current="isActive(m.id) ? 'page' : undefined"
          @click="navigate(m.id as ModuleId)"
        >
          <WwIcon :name="m.icon" size="md" class="ww-module-btn__icon" />
          <span v-if="showLabel" class="ww-module-btn__label">{{ m.label }}</span>
        </button>
      </div>
    </div>
  </nav>
</template>
<style>
.ww-module-nav {
  display: flex;
  flex-direction: column;
  width: var(--ww-sidebar-width);
  padding: 0 0.625rem;
}

.ww-module-nav--start {
  padding-top: 0;
}

.ww-module-nav__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  min-height: 100%;
  justify-content: flex-start;
}

.ww-module-nav__group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  width: 100%;
  align-items: center;
}

/* 居中：以整侧栏（含 titlebar 与 logo 上方区域）为基准垂直居中，logo 仍靠上 */
.ww-module-nav--center .ww-module-nav__inner {
  position: relative;
}

.ww-module-nav--center .ww-module-nav__group {
  position: absolute;
  top: 50%;
  right: 0;
  left: 0;
  flex: none;
  transform: translateY(-50%);
}

.ww-module-nav__brand {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
  padding: 0 0 0.75rem;
  margin-bottom: 0.25rem;
  border: none;
  background: transparent;
  cursor: default;
  user-select: none;
}

.ww-module-nav__brand-mark {
  display: block;
  width: 2rem;
  height: 2rem;
  object-fit: contain;
  flex-shrink: 0;
  border-radius: 0.625rem;
  box-shadow: var(--ww-rail-nav-active-shadow);
}

.ww-module-nav__brand-text {
  font-size: 0.5625rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ww-ink-faint);
}

.ww-module-btn {
  position: relative;
  display: flex;
  height: 3rem;
  width: 3rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 0.75rem;
  background: transparent;
  color: var(--ww-ink-muted);
  cursor: pointer;
  transition:
    background var(--ww-duration-fast) var(--ww-ease-out),
    color var(--ww-duration-fast) var(--ww-ease-out),
    box-shadow var(--ww-duration-fast) var(--ww-ease-out),
    transform var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-module-btn:active {
  transform: scale(0.96);
}

.ww-module-btn:focus-visible {
  outline: none;
  box-shadow: var(--ww-focus-ring);
}

.ww-module-btn i {
  font-size: 1.3125rem;
}

.ww-module-btn__icon {
  transition:
    color var(--ww-duration-fast) var(--ww-ease-out),
    transform var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-module-btn:hover {
  background: var(--ww-rail-nav-hover);
  color: var(--ww-ink);
}

.ww-module-btn.is-active {
  background: var(--ww-rail-nav-active-bg);
  color: var(--ww-ink);
  font-weight: 500;
  box-shadow: var(--ww-rail-nav-active-shadow);
}

.ww-module-btn.is-active .ww-module-btn__icon,
.ww-module-btn.is-active i {
  color: var(--ww-ink);
  transform: scale(1.04);
}

.ww-module-btn--labeled {
  width: 3rem;
  height: auto;
  min-height: 3rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.5rem 0.25rem 0.4375rem;
}

.ww-module-btn__label {
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.5625rem;
  line-height: 1.15;
  white-space: nowrap;
  text-align: center;
  color: var(--ww-ink-faint);
  transition: color var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-module-btn:hover .ww-module-btn__label {
  color: var(--ww-ink-muted);
}

.ww-module-btn.is-active .ww-module-btn__label {
  color: var(--ww-ink);
  font-weight: 600;
}

/* 二级导航 */
.ww-nav-item {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.5rem;
  border: none;
  border-radius: 0.375rem;
  padding: 0.4375rem 0.625rem 0.4375rem 0.75rem;
  text-align: left;
  font-size: 0.8125rem;
  color: var(--ww-ink);
  background: transparent;
  cursor: pointer;
  transition:
    background var(--ww-duration) var(--ww-ease-out),
    color var(--ww-duration) var(--ww-ease-out);
}

.ww-nav-item:hover {
  background: var(--ww-list-hover-bg);
}

.ww-nav-item.is-active {
  background: var(--ww-list-selected-bg);
  font-weight: 500;
  color: var(--ww-ink);
}

.ww-nav-item:focus-visible {
  outline: none;
  box-shadow: var(--ww-focus-ring);
}

.ww-nav-item i {
  width: 1rem;
  flex-shrink: 0;
  text-align: center;
  font-size: 0.75rem;
  color: var(--ww-ink-faint);
}

.ww-nav-item.is-active i {
  color: var(--ww-ink-muted);
}

.ww-feed-access-warn {
  font-size: 0.75rem;
  color: var(--ww-warn);
  cursor: help;
}

/* 物品卡 */
.ww-item-card {
  background: var(--ww-elevated);
  border: 1px solid var(--ww-border-subtle);
  box-shadow: none;
  transition:
    transform var(--ww-duration) var(--ww-ease-out),
    box-shadow var(--ww-duration) var(--ww-ease-out),
    border-color var(--ww-duration) var(--ww-ease-out),
    background var(--ww-duration) var(--ww-ease-out);
}
</style>
