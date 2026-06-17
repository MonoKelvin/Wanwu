<script setup lang="ts">
import { inject } from 'vue'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Skeleton from 'primevue/skeleton'
import WwIcon from '@shared/components/WwIcon.vue'
import { PERSONAL_PAGE_KEY } from '@modules/personal/composables/personalPageContext'

const page = inject(PERSONAL_PAGE_KEY)!
const {
  NICKNAME_MAX,
  BIO_MAX,
  loading,
  saving,
  nickname,
  bio,
  nicknameEditing,
  nicknameDraft,
  nicknameInputRef,
  nicknameEditRoot,
  nicknameMeasureRef,
  bioEditRoot,
  bioHovered,
  bioFocused,
  avatarImgReady,
  profileInitial,
  displayNickname,
  nicknameIsPlaceholder,
  bioDirty,
  showBioActions,
  showBioCounter,
  bioLength,
  nicknameFieldStyle,
  avatarUrl,
  hasBackground,
  onAvatarImgLoad,
  onBioFocusOut,
  onNicknameFieldFocusOut,
  startNicknameEdit,
  cancelNicknameEdit,
  applyNicknameEdit,
  openAvatarViewer,
  revertBio,
  applyBioEdit,
  pickAvatar,
  onBackgroundButtonClick
} = page
</script>

<template>
  <section class="ww-personal-profile" aria-label="个人资料">
    <div v-if="loading" class="ww-personal-profile__skeleton">
      <Skeleton shape="circle" size="4.25rem" class="mx-auto" />
      <Skeleton width="40%" height="1.25rem" class="mx-auto mt-4" />
      <Skeleton width="100%" height="3.25rem" class="mt-4" />
    </div>

    <div v-else class="ww-personal-profile__surface">
      <button
        type="button"
        class="ww-personal__bg-btn"
        :class="{ 'is-active': hasBackground }"
        :aria-label="hasBackground ? '调整页面背景' : '设置页面背景'"
        v-tooltip.bottom="hasBackground ? '调整页面背景' : '设置页面背景'"
        @click="onBackgroundButtonClick"
      >
        <WwIcon name="image" size="sm" />
      </button>

      <div class="ww-personal-profile__hero">
        <div class="ww-personal-profile__avatar" role="group" aria-label="头像">
          <span class="ww-personal-profile__avatar-ring" aria-hidden="true" />
          <span v-if="avatarUrl" class="ww-personal-profile__avatar-media">
            <img
              :src="avatarUrl"
              alt=""
              class="ww-personal-profile__avatar-img"
              :class="{ 'is-visible': avatarImgReady }"
              @load="onAvatarImgLoad"
            />
          </span>
          <span v-else class="ww-personal-profile__avatar-letter">{{ profileInitial }}</span>
          <div class="ww-personal-profile__avatar-overlay">
            <button
              type="button"
              class="ww-personal-profile__avatar-action"
              aria-label="更换头像"
              data-profile-field-action
              @mousedown.prevent
              @click.stop="pickAvatar"
            >
              <WwIcon name="pencil" size="sm" />
            </button>
            <button
              v-if="avatarUrl"
              type="button"
              class="ww-personal-profile__avatar-action"
              aria-label="查看头像"
              data-profile-field-action
              @mousedown.prevent
              @click.stop="openAvatarViewer"
            >
              <WwIcon name="eye" size="sm" />
            </button>
          </div>
        </div>

        <div class="ww-personal-nickname">
          <div class="ww-personal-nickname__slot">
            <div
              class="ww-personal-nickname__display"
              :class="{ 'is-inert': nicknameEditing }"
              role="button"
              tabindex="0"
              :aria-hidden="nicknameEditing"
              v-tooltip.bottom="'点击编辑昵称'"
              @click="startNicknameEdit"
              @keydown.enter.prevent="startNicknameEdit"
            >
              <span
                class="ww-personal-nickname__text"
                :class="{ 'is-placeholder': nicknameIsPlaceholder }"
              >
                {{ displayNickname }}
              </span>
            </div>
            <Transition name="ww-nickname-edit">
              <div
                v-if="nicknameEditing"
                ref="nicknameEditRoot"
                class="ww-personal-nickname__edit-overlay"
                @focusout="onNicknameFieldFocusOut"
              >
                <span ref="nicknameMeasureRef" class="ww-personal-nickname__measure" aria-hidden="true" />
                <div class="ww-personal-nickname__field" :style="nicknameFieldStyle">
                  <InputText
                    ref="nicknameInputRef"
                    v-model="nicknameDraft"
                    class="ww-personal-nickname__input"
                    placeholder="万物探索者"
                    :maxlength="NICKNAME_MAX"
                    :disabled="saving"
                    @keydown.enter.prevent="applyNicknameEdit"
                    @keydown.esc.prevent="cancelNicknameEdit"
                  />
                  <div
                    class="ww-personal-field__actions ww-personal-field__actions--inline"
                    role="group"
                    aria-label="昵称编辑"
                  >
                    <button
                      type="button"
                      class="ww-personal-field__action ww-personal-field__action--apply"
                      data-profile-field-action
                      :disabled="saving"
                      aria-label="应用昵称"
                      @mousedown.prevent
                      @click.stop="applyNicknameEdit"
                    >
                      <WwIcon name="check" size="xs" />
                    </button>
                    <button
                      type="button"
                      class="ww-personal-field__action ww-personal-field__action--cancel"
                      data-profile-field-action
                      :disabled="saving"
                      aria-label="取消编辑"
                      @mousedown.prevent
                      @click.stop="cancelNicknameEdit"
                    >
                      <WwIcon name="x" size="xs" />
                    </button>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <div ref="bioEditRoot" class="ww-personal-bio-wrap">
          <span class="ww-personal-bio__label">简介</span>
          <div
            class="ww-personal-bio"
            :class="{ 'is-dirty': bioDirty, 'is-hovered': bioHovered, 'is-focused': bioFocused }"
            @mouseenter="bioHovered = true"
            @mouseleave="bioHovered = false"
            @focusin="bioFocused = true"
            @focusout="onBioFocusOut"
          >
            <Textarea
              id="bio"
              v-model="bio"
              class="ww-personal-bio__input"
              rows="2"
              :maxlength="BIO_MAX"
              placeholder="写一句关于自己的介绍…"
              :disabled="saving"
            />
            <div class="ww-personal-bio__footer">
              <span v-if="showBioCounter" class="ww-personal-bio__counter" aria-live="polite">
                {{ bioLength }}/{{ BIO_MAX }}
              </span>
              <div
                class="ww-personal-field__actions ww-personal-field__actions--bio"
                :class="{ 'is-visible': showBioActions }"
                role="group"
                aria-label="简介编辑"
              >
                <button
                  type="button"
                  class="ww-personal-field__action ww-personal-field__action--apply"
                  :disabled="saving || !bioDirty"
                  aria-label="应用简介"
                  @click="applyBioEdit"
                >
                  <WwIcon name="check" size="xs" />
                </button>
                <button
                  type="button"
                  class="ww-personal-field__action ww-personal-field__action--cancel"
                  :disabled="saving || !bioDirty"
                  aria-label="还原简介"
                  @click="revertBio"
                >
                  <WwIcon name="x" size="xs" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style>
@import '../styles/personal-profile.css';
</style>
