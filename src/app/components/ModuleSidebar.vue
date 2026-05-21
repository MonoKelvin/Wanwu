<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@shared/stores/settings'
import { MODULE_NAV_ITEMS } from '@app/config/modules'
import { useModuleNavigation } from '@app/composables/useModuleNavigation'
import { useRouteModule } from '@app/composables/useRouteModule'
import WwIcon from '@shared/components/WwIcon.vue'
import { APP_LOGO_NAV } from '@shared/assets/app-logo'
import type { ModuleId } from '@shared/stores/app'

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
          :src="APP_LOGO_NAV"
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
