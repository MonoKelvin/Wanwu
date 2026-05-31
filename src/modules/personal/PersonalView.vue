<script setup lang="ts">
defineOptions({ name: 'PersonalView' })

import { provide } from 'vue'
import ModulePageLayout from '@app/components/ModulePageLayout.vue'
import PageHeader from '@app/components/PageHeader.vue'
import ImageViewer from '@shared/components/ImageViewer.vue'
import PersonalBackgroundEditor from '@modules/personal/PersonalBackgroundEditor.vue'
import PersonalBackgroundLayer from '@modules/personal/components/PersonalBackgroundLayer.vue'
import PersonalProfileSection from '@modules/personal/components/PersonalProfileSection.vue'
import PersonalFavoritesSection from '@modules/personal/components/PersonalFavoritesSection.vue'
import { usePersonalPage } from '@modules/personal/composables/usePersonalPage'
import { PERSONAL_PAGE_KEY } from '@modules/personal/composables/personalPageContext'

const page = usePersonalPage()
provide(PERSONAL_PAGE_KEY, page)

const {
  personalRoot,
  hasBackground,
  bgEditorOpen,
  bgEditorAutoFit,
  avatarViewerOpen,
  avatarViewerSlides,
  bgEditDraft,
  backgroundUrl,
  onBackgroundConfirm,
  onBackgroundCancel,
  onBackgroundReset,
  replaceBackground
} = page
</script>

<template>
  <div
    ref="personalRoot"
    class="ww-personal flex h-full flex-col overflow-hidden"
    :class="{ 'has-bg': hasBackground, 'is-editing-bg': bgEditorOpen }"
  >
    <PersonalBackgroundLayer />

    <ModulePageLayout class="ww-personal__scroll min-h-0 flex-1">
      <template #header>
        <PageHeader title="个人" subtitle="资料与收藏" />
      </template>
      <div class="ww-personal__inner">
        <PersonalProfileSection />
        <PersonalFavoritesSection />
      </div>
    </ModulePageLayout>

    <ImageViewer v-model:open="avatarViewerOpen" :slides="avatarViewerSlides" :index="0" />

    <PersonalBackgroundEditor
      v-if="bgEditorOpen"
      v-model="bgEditDraft"
      :image-url="backgroundUrl ?? ''"
      :auto-fit="bgEditorAutoFit"
      :viewport-el="personalRoot"
      @confirm="onBackgroundConfirm"
      @cancel="onBackgroundCancel"
      @replace="replaceBackground"
      @reset="onBackgroundReset"
    />
  </div>
</template>

<style>
@import './styles/personal-page.css';
</style>
