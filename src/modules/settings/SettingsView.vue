<script setup lang="ts">
defineOptions({ name: 'SettingsView' })

import { computed, onMounted, ref } from 'vue'
import { useSettingsStore } from '@shared/stores/settings'
import DataMigrateDialog from '@modules/settings/DataMigrateDialog.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import SettingsAppSection from '@modules/settings/sections/SettingsAppSection.vue'
import SettingsLibrarySection from '@modules/settings/sections/SettingsLibrarySection.vue'
import SettingsRssSection from '@modules/settings/sections/SettingsRssSection.vue'
import SettingsDataSection from '@modules/settings/sections/SettingsDataSection.vue'
import SettingsAboutSection from '@modules/settings/sections/SettingsAboutSection.vue'
import { SETTINGS_NAV_ITEMS } from '@modules/settings/sections/settingsNav'
import type { SettingsSection } from '@modules/settings/sections/types'

const settingsStore = useSettingsStore()

const activeSection = ref<SettingsSection>('app')
const paths = ref<{
  userData: string
  wanwu: string
  defaultWanwu: string
  isCustom: boolean
} | null>(null)
const migrateDialogVisible = ref(false)

const sectionTitle = computed(
  () => SETTINGS_NAV_ITEMS.find((n) => n.id === activeSection.value)?.label ?? '设置'
)

onMounted(async () => {
  paths.value = await window.wanwu.app.getPaths()
  if (!settingsStore.loaded) await settingsStore.load()
})

async function refreshPaths() {
  paths.value = await window.wanwu.app.getPaths()
}
</script>

<template>
  <!-- 外层承接 AppShell 的 flex-col；内层保持设置页左右分栏 -->
  <div class="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
  <div class="ww-settings-layout">
    <div class="ww-settings-layout__ambient" aria-hidden="true">
      <span class="ww-settings-layout__ambient-glow ww-settings-layout__ambient-glow--warm" />
      <span class="ww-settings-layout__ambient-glow ww-settings-layout__ambient-glow--cool" />
    </div>
    <nav class="ww-settings-nav" aria-label="设置分类">
      <p class="ww-settings-nav__heading">设置</p>
      <button
        v-for="item in SETTINGS_NAV_ITEMS"
        :key="item.id"
        type="button"
        class="ww-settings-nav__item"
        :class="{ 'is-active': activeSection === item.id }"
        @click="activeSection = item.id"
      >
        <WwIcon :name="item.icon" size="sm" class="ww-settings-nav__icon" />
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <div class="ww-settings-panel">
      <header class="ww-settings-panel__header">
        <h1 class="ww-settings-panel__title">{{ sectionTitle }}</h1>
      </header>

      <div class="ww-settings-panel__body">
        <SettingsAppSection v-show="activeSection === 'app'" />
        <SettingsLibrarySection v-show="activeSection === 'library'" />
        <SettingsRssSection v-show="activeSection === 'rss'" />
        <SettingsDataSection
          v-show="activeSection === 'data'"
          :paths="paths"
          @open-migrate="migrateDialogVisible = true"
        />
        <SettingsAboutSection v-show="activeSection === 'about'" :visible="activeSection === 'about'" />
      </div>
    </div>

    <DataMigrateDialog
      v-if="paths"
      v-model:visible="migrateDialogVisible"
      :current-path="paths.wanwu"
      @done="refreshPaths"
    />
  </div>
  </div>
</template>
<style>
/* 璁剧疆椤?*/
.ww-settings-layout {
  position: relative;
  display: flex;
  flex-direction: row;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: var(--ww-content);
}

.ww-settings-layout__ambient {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.ww-settings-layout__ambient-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(72px);
  opacity: 0.5;
  mix-blend-mode: multiply;
}

.ww-settings-layout__ambient-glow--warm {
  top: -6%;
  right: 10%;
  width: min(26rem, 65vw);
  height: min(16rem, 38vh);
  background: radial-gradient(circle at center, rgb(255 248 230 / 0.85) 0%, transparent 70%);
}

.ww-settings-layout__ambient-glow--cool {
  bottom: 5%;
  left: 5%;
  width: min(20rem, 50vw);
  height: min(14rem, 32vh);
  background: radial-gradient(circle at center, rgb(18 18 22 / 0.04) 0%, transparent 72%);
  mix-blend-mode: normal;
  opacity: 1;
}

/* 鈥斺€?宸︿晶瀵艰埅 鈥斺€?*/
.ww-settings-nav {
  position: relative;
  z-index: 1;
  display: flex;
  width: 10.5rem;
  flex-shrink: 0;
  flex-direction: column;
  gap: 0.125rem;
  padding: calc(var(--ww-titlebar-height) + 0.875rem) 0.5rem 0.875rem;
  border-right: 1px solid var(--ww-border-subtle);
  background: var(--ww-settings-nav-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.ww-settings-nav__heading {
  margin: 0 0 0.625rem;
  padding: 0 0.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--ww-ink);
}

.ww-settings-nav__item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.5rem;
  border: none;
  border-radius: 0.5rem;
  padding: 0.5rem 0.5rem;
  text-align: left;
  font-size: 0.8125rem;
  color: var(--ww-ink-muted);
  background: transparent;
  cursor: pointer;
  transition:
    background var(--ww-duration-fast) var(--ww-ease-out),
    color var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-settings-nav__item:hover {
  background: var(--ww-list-hover-bg);
  color: var(--ww-ink);
}

.ww-settings-nav__item.is-active {
  font-weight: 500;
  color: var(--ww-ink);
  background: var(--ww-list-selected-bg);
  box-shadow: inset 0 0 0 1px var(--ww-list-hover-ring);
}

.ww-settings-nav__icon {
  flex-shrink: 0;
  opacity: 0.85;
}

.ww-settings-nav__item.is-active .ww-settings-nav__icon {
  opacity: 1;
}

/* 鈥斺€?鍙充晶鍐呭 鈥斺€?*/
.ww-settings-panel {
  position: relative;
  z-index: 1;
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
}

.ww-settings-panel__header {
  display: flex;
  flex-shrink: 0;
  justify-content: center;
  padding: calc(var(--ww-titlebar-height) + 2rem) 1.25rem 0.75rem;
  border-bottom: 1px solid var(--ww-border-subtle);
}

.ww-settings-panel__title {
  width: 100%;
  max-width: var(--ww-settings-content-max, 36rem);
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--ww-ink);
}

.ww-settings-panel__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;
  padding: 2rem 1.25rem 1.5rem;
}

.ww-settings-section {
  width: 100%;
  max-width: var(--ww-settings-content-max, 36rem);
  margin-inline: auto;
  animation: ww-settings-fade-in var(--ww-duration) var(--ww-ease-out) both;
}

@keyframes ww-settings-fade-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 鈥斺€?鍒嗙粍鍗＄墖 鈥斺€?*/
.ww-settings-group {
  border: 1px solid var(--ww-border-subtle);
  border-radius: 0.75rem;
  background: var(--ww-elevated);
  box-shadow: none;
  overflow: hidden;
  transition: box-shadow var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-settings-group:hover {
  box-shadow: var(--ww-shadow-card);
}

.ww-settings-group + .ww-settings-group,
.ww-settings-about-hero + .ww-settings-group,
.ww-settings-group + .ww-settings-repo-link {
  margin-top: 0.75rem;
}

.ww-settings-group--stack {
  padding: 0;
}

.ww-settings-group--muted {
  margin-top: 0.75rem;
  background: var(--ww-inset);
  box-shadow: none;
}

.ww-settings-group--muted:hover {
  box-shadow: none;
}

.ww-settings-group__label {
  margin: 0;
  padding: 0.75rem 1rem 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ww-ink-muted);
}

.ww-settings-group .ww-settings-prose {
  margin: 0;
  padding: 0.5rem 1rem 1rem;
}

/* 鈥斺€?璁剧疆琛?鈥斺€?*/
.ww-settings-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.8125rem 1rem;
  border-bottom: 1px solid var(--ww-border-faint);
}

.ww-settings-row:last-child {
  border-bottom: none;
}

.ww-settings-row__label {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  min-height: 2rem;
  padding-right: 1rem;
}

.ww-settings-row__label.is-centered {
  justify-content: center;
}

.ww-settings-row__title {
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.35;
  color: var(--ww-ink);
}

.ww-settings-row__subtitle {
  margin-top: 0.125rem;
  font-size: 0.6875rem;
  line-height: 1.45;
  color: var(--ww-ink-faint);
}

.ww-settings-row__control {
  display: flex;
  flex: 0 0 auto;
  flex-shrink: 0;
  align-items: center;
  justify-content: flex-end;
  max-width: max-content;
}

.ww-settings-switch.p-toggleswitch {
  flex-shrink: 0;
}

.ww-settings-switch.p-toggleswitch.p-disabled {
  opacity: 0.55;
}

.ww-settings-row:not(:has(.ww-settings-row__control)) .ww-settings-row__label {
  flex: 1;
  max-width: none;
}

/* 鍒嗘鎸夐挳锛氱瓑鍒嗗搴?+ 缁熶竴鍐呰竟璺濓紝閬垮厤閫変腑鏃舵枃瀛椾綅绉?*/
.ww-settings-segment.p-selectbutton {
  display: inline-flex;
  flex-shrink: 0;
  gap: 0.1875rem;
  padding: 0.1875rem;
  border-radius: 0.4375rem;
  background: var(--ww-inset);
  border: 1px solid var(--ww-border-faint);
}

.ww-settings-segment.p-selectbutton .p-togglebutton {
  flex: 1 1 0;
  min-width: 3.25rem;
  height: auto;
  justify-content: center;
  border: none !important;
  border-radius: 0.3125rem !important;
  border-start-start-radius: 0.3125rem !important;
  border-start-end-radius: 0.3125rem !important;
  border-end-start-radius: 0.3125rem !important;
  border-end-end-radius: 0.3125rem !important;
  padding: 0.3125rem 0.6875rem !important;
  font-size: 0.8125rem !important;
  line-height: 1.25 !important;
  font-weight: 500;
  color: var(--ww-ink-muted) !important;
  background: transparent !important;
  box-shadow: none !important;
  transition:
    color var(--ww-duration-fast) var(--ww-ease-out),
    background var(--ww-duration-fast) var(--ww-ease-out),
    box-shadow var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-settings-segment.p-selectbutton .p-togglebutton .p-togglebutton-content {
  padding: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  transition: inherit;
}

.ww-settings-segment.p-selectbutton .p-togglebutton-label {
  white-space: nowrap;
}

.ww-settings-segment.p-selectbutton .p-togglebutton:not(.p-togglebutton-checked):hover {
  color: var(--ww-ink) !important;
  background: var(--ww-list-hover-bg) !important;
}

.ww-settings-segment.p-selectbutton .p-togglebutton.p-togglebutton-checked,
.ww-settings-segment.p-selectbutton .p-togglebutton[data-p-checked='true'] {
  color: var(--ww-ink) !important;
  background: var(--ww-elevated) !important;
  box-shadow: 0 1px 3px rgb(18 18 22 / 0.08) !important;
}

.ww-settings-segment.p-selectbutton .p-togglebutton.p-togglebutton-checked .p-togglebutton-content,
.ww-settings-segment.p-selectbutton .p-togglebutton[data-p-checked='true'] .p-togglebutton-content {
  background: transparent !important;
  box-shadow: none !important;
}

/* 杈冮暱鏂囨锛堝銆屽浘鏍?鏂囧瓧銆嶏級 */
.ww-settings-segment--wide.p-selectbutton {
  min-width: 11.5rem;
}

.ww-settings-segment--wide.p-selectbutton .p-togglebutton {
  min-width: 0;
}

[data-theme='dark'] .ww-settings-segment.p-selectbutton .p-togglebutton.p-togglebutton-checked,
[data-theme='dark'] .ww-settings-segment.p-selectbutton .p-togglebutton[data-p-checked='true'] {
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.28) !important;
}

/* 仅图标（工具栏视图切换等） */
.ww-settings-segment--icon.p-selectbutton {
  gap: 0.25rem;
}

.ww-settings-segment--icon.p-selectbutton .p-togglebutton {
  flex: 0 0 auto;
  min-width: 2rem;
  width: 2rem;
  height: calc(var(--ww-toolbar-h, 2.125rem) - 0.5rem);
  margin: 0;
  padding: 0 !important;
  border-radius: 0.3125rem !important;
}

.ww-settings-segment--icon.p-selectbutton .p-togglebutton-label {
  display: none;
}

.ww-view-mode-toggle.p-selectbutton .p-togglebutton .p-togglebutton-content {
  padding: 0.25rem !important;
}

.ww-view-mode-toggle__option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
}

/* 鈥斺€?鏁版嵁鐩綍 / 澶囦唤鍧?鈥斺€?*/
.ww-settings-block {
  padding: 1rem;
}

.ww-settings-block--data .ww-settings-block__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.625rem;
}

.ww-settings-block--data .ww-settings-block__head .ww-settings-block__subtitle {
  margin: 0.25rem 0 0;
}

.ww-settings-block--inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.ww-settings-block--inline .ww-settings-block__text {
  flex: 1;
  min-width: 0;
}

.ww-settings-block--inline .ww-settings-block__subtitle {
  margin: 0.25rem 0 0;
}

.ww-settings-block__actions--end {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0;
}
.ww-settings-block__title {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--ww-ink);
}

.ww-settings-block__subtitle {
  margin: 0.25rem 0 0.625rem;
  font-size: 0.6875rem;
  line-height: 1.45;
  color: var(--ww-ink-faint);
}

.ww-settings-path-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5625rem 0.75rem;
  border: 1px solid var(--ww-border-faint);
  border-radius: 0.5rem;
  background: var(--ww-inset);
  cursor: pointer;
  text-align: left;
  transition:
    background var(--ww-duration-fast) var(--ww-ease-out),
    border-color var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-settings-path-row:hover {
  background: var(--ww-list-hover-bg);
  border-color: rgb(18 18 22 / 0.1);
}

.ww-settings-path-row:focus-visible {
  outline: 2px solid var(--ww-list-selected-ring);
  outline-offset: 2px;
}

.ww-settings-path-row__path {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.6875rem;
  line-height: 1.5;
  word-break: break-all;
  color: var(--ww-ink-muted);
}

.ww-settings-path-row:hover .ww-settings-path-row__path {
  color: var(--ww-ink);
}

.ww-settings-path-row__icon {
  flex-shrink: 0;
  color: var(--ww-ink-faint);
  opacity: 0.85;
  transition: color var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-settings-path-row:hover .ww-settings-path-row__icon {
  color: var(--ww-ink);
  opacity: 1;
}
.ww-settings-block__meta {
  margin: 0.5rem 0 0;
  font-size: 0.6875rem;
  color: var(--ww-ink-faint);
}

.ww-settings-block__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.875rem;
}
/* 鈥斺€?鍏充簬 鈥斺€?*/
.ww-settings-section--about {
  max-width: var(--ww-settings-content-max, 36rem);
}

.ww-settings-about-hero {
  --ww-about-hero-hover-border: rgb(18 18 22 / 0.1);
  --ww-about-hero-hover-shadow: 0 12px 36px -10px rgb(18 18 22 / 0.14);
  --ww-about-hero-hover-inset: 0 0 0 1px rgb(255 255 255 / 0.35) inset;
  --ww-about-hero-logo-border-hover: rgb(18 18 22 / 0.12);
  --ww-about-hero-logo-shadow: 0 10px 28px -8px rgb(18 18 22 / 0.18);
  --ww-about-hero-logo-inset: 0 0 0 1px rgb(255 255 255 / 0.5) inset;

  position: relative;
  margin-bottom: 0.75rem;
  min-height: 5.25rem;
  border: 1px solid var(--ww-border-subtle);
  border-radius: 0.75rem;
  overflow: hidden;
  isolation: isolate;
  background: var(--ww-elevated);
  box-shadow: none;
  transition:
    border-color var(--ww-duration) var(--ww-ease-out),
    box-shadow var(--ww-duration-slow) var(--ww-ease-out-slow),
    transform var(--ww-duration) var(--ww-ease-out);
}

.ww-settings-about-hero:hover {
  border-color: var(--ww-about-hero-hover-border);
  box-shadow: var(--ww-about-hero-hover-shadow), var(--ww-about-hero-hover-inset);
  transform: translateY(-1px);
}

/* —— 关于页 hero CSS 动效见 about-hero-fx.css —— */

.ww-settings-about-hero__content {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.375rem 1.5rem;
}

.ww-settings-about-hero__logo {
  flex-shrink: 0;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 0.875rem;
  border: 1px solid var(--ww-about-hero-logo-border, var(--ww-border-faint));
  transition:
    transform var(--ww-duration-slow) var(--ww-ease-out-slow),
    box-shadow var(--ww-duration-slow) var(--ww-ease-out-slow),
    border-color var(--ww-duration) var(--ww-ease-out);
}

.ww-settings-about-hero:hover .ww-settings-about-hero__logo {
  transform: scale(1.06) rotate(-2deg);
  border-color: var(--ww-about-hero-logo-border-hover);
  box-shadow: var(--ww-about-hero-logo-shadow), var(--ww-about-hero-logo-inset);
}

.ww-settings-about-hero__main {
  flex: 1;
  min-width: 0;
  transition: transform var(--ww-duration) var(--ww-ease-out);
}

.ww-settings-about-hero:hover .ww-settings-about-hero__main {
  transform: translateX(2px);
}

.ww-settings-about-hero__name {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.3;
  color: var(--ww-ink);
  transition: letter-spacing var(--ww-duration-slow) var(--ww-ease-out-slow);
}

.ww-settings-about-hero:hover .ww-settings-about-hero__name {
  letter-spacing: -0.01em;
}

.ww-settings-about-hero__subtitle {
  margin: 0.4375rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--ww-ink-muted);
  transition: color var(--ww-duration) var(--ww-ease-out);
}

.ww-settings-about-hero:hover .ww-settings-about-hero__subtitle {
  color: var(--ww-ink);
}

.ww-settings-about-hero__subtitle strong {
  font-weight: 600;
  color: var(--ww-ink);
}

.ww-settings-about-hero__version {
  flex-shrink: 0;
  align-self: center;
  font-size: 1rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  color: var(--ww-ink-muted);
  transition:
    transform var(--ww-duration) var(--ww-ease-out),
    color var(--ww-duration) var(--ww-ease-out);
}

.ww-settings-about-hero:hover .ww-settings-about-hero__version {
  transform: translateX(-2px);
  color: var(--ww-ink);
}

@media (prefers-reduced-motion: reduce) {
  .ww-settings-about-hero,
  .ww-settings-about-hero__logo,
  .ww-settings-about-hero__main,
  .ww-settings-about-hero__version {
    transition-duration: 0.15s !important;
  }

  .ww-settings-about-hero:hover {
    transform: none;
  }
}

.ww-settings-prose {
  font-size: 0.8125rem;
  line-height: 1.65;
  color: var(--ww-ink-muted);
}

.ww-settings-dev-list {
  margin: 0;
  padding: 0.25rem 0 0.5rem;
  list-style: none;
}

.ww-settings-dev-link {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  text-decoration: none;
  transition: background var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-settings-dev-link:hover {
  background: var(--ww-list-hover-bg);
}

.ww-settings-dev-link__name {
  flex-shrink: 0;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.35;
  color: var(--ww-ink);
}

.ww-settings-dev-link__note {
  flex: 1;
  min-width: 0;
  font-size: 0.6875rem;
  line-height: 1.35;
  color: var(--ww-ink-faint);
}

.ww-settings-dev-link > .ww-icon {
  flex-shrink: 0;
  align-self: center;
}

.ww-settings-repo-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  margin-top: 0.75rem;
  padding: 0.875rem 1rem;
  border: 1px solid var(--ww-border-subtle);
  border-radius: 0.75rem;
  text-decoration: none;
  background: var(--ww-elevated);
  box-shadow: none;
  transition:
    border-color var(--ww-duration-fast) var(--ww-ease-out),
    background var(--ww-duration-fast) var(--ww-ease-out),
    box-shadow var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-settings-repo-link:hover {
  border-color: rgb(18 18 22 / 0.12);
  background: var(--ww-list-hover-bg);
  box-shadow: var(--ww-shadow-card);
}

.ww-settings-repo-link__icon {
  flex-shrink: 0;
  align-self: center;
  color: var(--ww-ink);
}

.ww-settings-repo-link__url {
  flex: 1;
  min-width: 0;
  align-self: center;
  font-size: 0.75rem;
  line-height: 1.35;
  text-align: right;
  word-break: break-all;
  color: var(--ww-ink-muted);
}

/* 鈥斺€?杩佺Щ瀵硅瘽妗?鈥斺€?*/
.ww-settings-migrate-dialog__body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.ww-settings-migrate-dialog__body.is-center {
  align-items: center;
  text-align: center;
  padding: 0.5rem 0;
}

.ww-settings-migrate-dialog__lead {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: var(--ww-ink-muted);
}

.ww-settings-migrate-dialog__code {
  padding: 0.1em 0.35em;
  border-radius: 0.25rem;
  font-size: 0.75em;
  background: rgb(18 18 22 / 0.06);
}

.ww-settings-migrate-dialog__list {
  margin: 0;
  padding-left: 1.125rem;
  font-size: 0.75rem;
  line-height: 1.55;
  color: var(--ww-ink-faint);
}

.ww-settings-migrate-dialog__current {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.625rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--ww-border-faint);
  background: var(--ww-inset);
}

.ww-settings-migrate-dialog__current-label {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--ww-ink-faint);
}

.ww-settings-migrate-dialog__path {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.6875rem;
  line-height: 1.5;
  word-break: break-all;
  color: var(--ww-ink-muted);
}

.ww-settings-migrate-dialog__path.is-highlight {
  padding: 0.5rem 0.625rem;
  border-radius: 0.375rem;
  background: rgb(18 18 22 / 0.04);
  color: var(--ww-ink);
}

.ww-settings-migrate-dialog__check {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--ww-ink-muted);
  cursor: pointer;
}

.ww-settings-migrate-dialog__error {
  margin: 0;
  font-size: 0.75rem;
  color: #dc2626;
}
</style>
