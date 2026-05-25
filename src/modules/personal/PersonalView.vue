<script setup lang="ts">
defineOptions({ name: 'PersonalView' })

import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useItemDetailNavigation } from '@app/composables/useItemDetailNavigation'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Skeleton from 'primevue/skeleton'
import WwIcon from '@shared/components/WwIcon.vue'
import ModulePageLayout from '@app/components/ModulePageLayout.vue'
import PageHeader from '@app/components/PageHeader.vue'
import EmptyState from '@app/components/EmptyState.vue'
import FavoriteCard from '@features/personal/FavoriteCard.vue'
import PersonalBackgroundEditor from '@features/personal/PersonalBackgroundEditor.vue'
import ImageViewer from '@shared/components/ImageViewer.vue'
import type { ImageViewerSlide } from '@shared/types/image-viewer'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import type { PersonalBackgroundConfig } from '@shared/types/profile'
import { DEFAULT_BACKGROUND_CONFIG } from '@shared/types/profile'
import {
  backgroundLayerStyle,
  loadImageDimensions,
  normalizeBackgroundConfig,
  profileConfigForIpc,
  toWanwuMediaUrl
} from '@shared/utils/profileMedia'
import type { FavoriteGroup } from '@shared/types/favorite'

const { openItemDetail } = useItemDetailNavigation()
const toast = useWanwuToast()

const NICKNAME_MAX = 12
const BIO_MAX = 50

const nickname = ref('')
const bio = ref('')
const savedNickname = ref('')
const savedBio = ref('')
const nicknameEditing = ref(false)
const nicknameDraft = ref('')
const nicknameInputRef = ref<InstanceType<typeof InputText> | null>(null)
const nicknameEditRoot = ref<HTMLElement | null>(null)
const nicknameMeasureRef = ref<HTMLElement | null>(null)
const bioEditRoot = ref<HTMLElement | null>(null)
const bioHovered = ref(false)
const bioFocused = ref(false)
const avatarImgReady = ref(false)
const avatarViewerOpen = ref(false)
const nicknameFieldWidthPx = ref(0)

/** 与 .ww-personal-nickname__input 一致：左内边距 + 右侧图标区（px，约 0.625rem + 2.75rem） */
const NICKNAME_PAD_LEFT_PX = 10
const NICKNAME_ICON_AREA_PX = 44
/** 用于左右各留一字宽的参考汉字 */
const NICKNAME_CHAR_SAMPLE = '汉'

const avatarPath = ref<string | null>(null)
const avatarMediaKey = ref(0)
const backgroundPath = ref<string | null>(null)
const previewBackgroundPath = ref<string | null>(null)
const backgroundMediaKey = ref(0)
const backgroundConfig = ref<PersonalBackgroundConfig>({ ...DEFAULT_BACKGROUND_CONFIG })
const groups = ref<FavoriteGroup[]>([])
const loading = ref(true)
const saving = ref(false)
const bgEditorOpen = ref(false)
const bgEditorAutoFit = ref(false)
const bgDraftClearsImage = ref(false)
const bgEditDraft = ref<PersonalBackgroundConfig>({ ...DEFAULT_BACKGROUND_CONFIG })
const personalRoot = ref<HTMLElement | null>(null)
const backgroundImageSize = ref({ width: 0, height: 0 })
const viewportSize = ref({ width: 0, height: 0 })

const profileInitial = computed(() => {
  const n = (nicknameEditing.value ? nicknameDraft.value : nickname.value).trim()
  if (!n) return '?'
  return n.slice(0, 1).toUpperCase()
})

const displayNickname = computed(() => {
  const n = nickname.value.trim()
  return n || '万物探索者'
})

const nicknameIsPlaceholder = computed(() => !nickname.value.trim())
const bioDirty = computed(() => bio.value !== savedBio.value)
const showBioActions = computed(() => bioHovered.value || bioDirty.value || bioFocused.value)
const showBioCounter = computed(() => bioFocused.value || bioDirty.value)
const bioLength = computed(() => bio.value.length)

const profileEditActive = computed(
  () => nicknameEditing.value || bioFocused.value || bioDirty.value
)

const nicknameFieldStyle = computed(() => {
  if (!nicknameEditing.value || nicknameFieldWidthPx.value <= 0) return undefined
  return { width: `${nicknameFieldWidthPx.value}px` }
})

const avatarUrl = computed(() =>
  toWanwuMediaUrl(avatarPath.value, avatarMediaKey.value || undefined)
)

const avatarViewerSlides = computed<ImageViewerSlide[]>(() => {
  if (!avatarPath.value || !avatarUrl.value) return []
  return [{ url: avatarUrl.value, alt: `${displayNickname.value} 的头像` }]
})

const effectiveBackgroundPath = computed(() =>
  bgEditorOpen.value ? previewBackgroundPath.value : backgroundPath.value
)

const backgroundUrl = computed(() =>
  toWanwuMediaUrl(effectiveBackgroundPath.value, backgroundMediaKey.value || undefined)
)

const activeBackgroundConfig = computed(() =>
  bgEditorOpen.value ? bgEditDraft.value : backgroundConfig.value
)

const backgroundStyle = computed(() => {
  if (!backgroundUrl.value) return undefined
  const vw = viewportSize.value.width || personalRoot.value?.clientWidth || 0
  const vh = viewportSize.value.height || personalRoot.value?.clientHeight || 0
  const layer = backgroundLayerStyle(
    activeBackgroundConfig.value,
    vw || undefined,
    vh || undefined,
    backgroundImageSize.value.width || undefined,
    backgroundImageSize.value.height || undefined
  )
  if (bgEditorOpen.value) {
    layer['--ww-personal-bg-clip'] = 'none'
  }
  return {
    ...layer,
    backgroundImage: `url(${backgroundUrl.value})`
  }
})

async function refreshBackgroundImageSize() {
  if (!backgroundUrl.value) {
    backgroundImageSize.value = { width: 0, height: 0 }
    return
  }
  try {
    backgroundImageSize.value = await loadImageDimensions(backgroundUrl.value)
  } catch {
    backgroundImageSize.value = { width: 0, height: 0 }
  }
}

function refreshViewportSize() {
  const el = personalRoot.value
  if (!el) return
  viewportSize.value = { width: el.clientWidth, height: el.clientHeight }
}

watch(backgroundUrl, () => {
  void refreshBackgroundImageSize()
})

watch(avatarUrl, () => {
  avatarImgReady.value = false
})

watch(nicknameDraft, (v) => {
  if (v.length > NICKNAME_MAX) nicknameDraft.value = v.slice(0, NICKNAME_MAX)
  if (nicknameEditing.value) measureNicknameFieldWidth()
})

watch(bio, (v) => {
  if (v.length > BIO_MAX) bio.value = v.slice(0, BIO_MAX)
})

const hasBackground = computed(() => Boolean(backgroundUrl.value))

const favoriteCount = computed(() =>
  groups.value.reduce((sum, g) => sum + g.items.length, 0)
)

function syncSavedProfileFields() {
  savedNickname.value = nickname.value
  savedBio.value = bio.value
}

function clampProfileTextFields() {
  if (nickname.value.length > NICKNAME_MAX) nickname.value = nickname.value.slice(0, NICKNAME_MAX)
  if (bio.value.length > BIO_MAX) bio.value = bio.value.slice(0, BIO_MAX)
  if (nicknameDraft.value.length > NICKNAME_MAX) {
    nicknameDraft.value = nicknameDraft.value.slice(0, NICKNAME_MAX)
  }
}

function onAvatarImgLoad() {
  avatarImgReady.value = true
}

function measureNicknameTextWidth(measure: HTMLElement, text: string): number {
  measure.textContent = text
  // scrollWidth 对中文全角字符比 getBoundingClientRect 更稳定
  return Math.ceil(measure.scrollWidth)
}

function measureNicknameCharWidth(measure: HTMLElement): number {
  return measureNicknameTextWidth(measure, NICKNAME_CHAR_SAMPLE)
}

function measureNicknameFieldWidth() {
  const measure = nicknameMeasureRef.value
  const container = nicknameEditRoot.value?.parentElement
  if (!measure || !container) return

  const charW = measureNicknameCharWidth(measure)
  /** 文本左右各留一字宽，避免贴边或被图标遮挡 */
  const sideCharPad = charW * 2
  const fieldExtras = NICKNAME_PAD_LEFT_PX + NICKNAME_ICON_AREA_PX + sideCharPad

  const sample = nicknameDraft.value.length > 0 ? nicknameDraft.value : '万物探索者'
  const contentW = measureNicknameTextWidth(measure, sample)
  const maxContentW = measureNicknameTextWidth(measure, '字'.repeat(NICKNAME_MAX))
  const minContentW = measureNicknameTextWidth(measure, '万物探索者')

  const maxFieldW = Math.min(container.clientWidth, maxContentW + fieldExtras)
  const minFieldW = minContentW + fieldExtras
  const nextW = contentW + fieldExtras

  nicknameFieldWidthPx.value = Math.min(maxFieldW, Math.max(minFieldW, nextW))
}

let profileDismissBound = false

function bindProfileDismiss() {
  if (profileDismissBound) return
  profileDismissBound = true
  document.addEventListener('pointerdown', onProfileDismiss, true)
}

function unbindProfileDismiss() {
  if (!profileDismissBound) return
  profileDismissBound = false
  document.removeEventListener('pointerdown', onProfileDismiss, true)
}

function isProfileFieldActionTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('[data-profile-field-action]'))
}

function onProfileDismiss(e: PointerEvent) {
  const target = e.target
  if (!(target instanceof Node)) return

  if (nicknameEditing.value) {
    if (isProfileFieldActionTarget(target)) return
    if (nicknameEditRoot.value && !nicknameEditRoot.value.contains(target)) {
      cancelNicknameEdit()
      return
    }
  }

  if (bioEditRoot.value && !bioEditRoot.value.contains(target)) {
    if (bioDirty.value) revertBio()
    blurBioField()
  }
}

function blurBioField() {
  bioFocused.value = false
  const el = document.getElementById('bio')
  if (el instanceof HTMLElement) el.blur()
}

function onBioFocusOut(e: FocusEvent) {
  const root = e.currentTarget as HTMLElement
  const next = e.relatedTarget as Node | null
  if (next && root.contains(next)) return
  bioFocused.value = false
  requestAnimationFrame(() => {
    if (bioFocused.value) return
    if (bioEditRoot.value?.contains(document.activeElement)) return
    if (bioDirty.value) revertBio()
  })
}

function onNicknameFieldFocusOut(e: FocusEvent) {
  if (!nicknameEditing.value) return
  const root = nicknameEditRoot.value
  const next = e.relatedTarget as Node | null
  if (next && root?.contains(next)) return
  if (isProfileFieldActionTarget(next)) return
  requestAnimationFrame(() => {
    if (!nicknameEditing.value) return
    if (root?.contains(document.activeElement)) return
    if (isProfileFieldActionTarget(document.activeElement)) return
    cancelNicknameEdit()
  })
}

watch(profileEditActive, (active) => {
  if (active) bindProfileDismiss()
  else unbindProfileDismiss()
})

async function persistProfile(message?: string) {
  saving.value = true
  try {
    await window.wanwu.user.updateProfile({
      nickname: nickname.value,
      bio: bio.value,
      avatarPath: avatarPath.value,
      backgroundPath: backgroundPath.value,
      backgroundConfig: profileConfigForIpc(backgroundConfig.value)
    })
    syncSavedProfileFields()
    if (message) toast.success(message)
  } finally {
    saving.value = false
  }
}

async function load() {
  loading.value = true
  try {
    const [profile, list] = await Promise.all([
      window.wanwu.user.getProfile(),
      window.wanwu.user.listFavoriteGroups()
    ])
    if (profile) {
      nickname.value = profile.nickname
      bio.value = profile.bio
      clampProfileTextFields()
      syncSavedProfileFields()
      avatarPath.value = profile.avatarPath
      if (profile.avatarPath) avatarMediaKey.value = Date.now()
      backgroundPath.value = profile.backgroundPath
      if (profile.backgroundPath) backgroundMediaKey.value = Date.now()
      backgroundConfig.value = normalizeBackgroundConfig(
        profile.backgroundConfig as PersonalBackgroundConfig | null
      )
    }
    groups.value = list
    await refreshBackgroundImageSize()
  } finally {
    loading.value = false
  }
}

let viewportResizeObserver: ResizeObserver | null = null

onMounted(async () => {
  await load()
  await refreshBackgroundImageSize()
  await nextTick()
  refreshViewportSize()
  if (personalRoot.value) {
    viewportResizeObserver = new ResizeObserver(() => refreshViewportSize())
    viewportResizeObserver.observe(personalRoot.value)
  }
})

onUnmounted(() => {
  viewportResizeObserver?.disconnect()
  unbindProfileDismiss()
})

function focusNicknameInput() {
  nextTick(() => {
    const comp = nicknameInputRef.value as { $el?: HTMLElement } | null
    const el = comp?.$el
    const input = el?.querySelector('input') ?? el
    input?.focus()
    if (input instanceof HTMLInputElement) input.select()
  })
}

function startNicknameEdit() {
  if (nicknameEditing.value) return
  nicknameDraft.value = nickname.value.slice(0, NICKNAME_MAX)
  nicknameEditing.value = true
  nextTick(() => {
    measureNicknameFieldWidth()
    focusNicknameInput()
  })
}

function cancelNicknameEdit() {
  nicknameDraft.value = savedNickname.value
  nickname.value = savedNickname.value
  nicknameEditing.value = false
}

async function applyNicknameEdit() {
  const next = nicknameDraft.value.trim().slice(0, NICKNAME_MAX)
  nicknameEditing.value = false
  if (next === savedNickname.value.trim()) {
    nickname.value = savedNickname.value
    return
  }
  nickname.value = next
  await persistProfile('昵称已更新')
}

function openAvatarViewer() {
  if (!avatarUrl.value) return
  avatarViewerOpen.value = true
}

function revertBio() {
  bio.value = savedBio.value
}

async function applyBioEdit() {
  if (!bioDirty.value) return
  await persistProfile('简介已更新')
}

async function pickAvatar() {
  const pick = await window.wanwu.shell.pickImageFile()
  if (!pick.ok || !pick.path) return
  try {
    const result = await window.wanwu.user.importProfileImage({ kind: 'avatar', filePath: pick.path })
    avatarPath.value = result.relativePath
    avatarMediaKey.value = Date.now()
    toast.success('头像已更新')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : '头像更新失败')
  }
}

async function startBackgroundSetup() {
  const pick = await window.wanwu.shell.pickImageFile()
  if (!pick.ok || !pick.path) return
  try {
    const result = await window.wanwu.user.importProfileImage({
      kind: 'background',
      filePath: pick.path
    })
    previewBackgroundPath.value = result.relativePath
    backgroundMediaKey.value = Date.now()
    bgEditDraft.value = normalizeBackgroundConfig({ ...DEFAULT_BACKGROUND_CONFIG })
    bgEditorAutoFit.value = true
    bgDraftClearsImage.value = false
    bgEditorOpen.value = true
  } catch (err) {
    toast.error(err instanceof Error ? err.message : '无法导入背景图')
  }
}

async function replaceBackground() {
  const pick = await window.wanwu.shell.pickImageFile()
  if (!pick.ok || !pick.path) return
  try {
    const result = await window.wanwu.user.importProfileImage({
      kind: 'background',
      filePath: pick.path
    })
    previewBackgroundPath.value = result.relativePath
    backgroundMediaKey.value = Date.now()
    const prev = normalizeBackgroundConfig(bgEditDraft.value)
    bgEditDraft.value = normalizeBackgroundConfig({
      opacity: prev.opacity,
      scale: DEFAULT_BACKGROUND_CONFIG.scale,
      offsetX: 0,
      offsetY: 0,
      crop: null
    })
    bgEditorAutoFit.value = true
    bgDraftClearsImage.value = false
  } catch (err) {
    toast.error(err instanceof Error ? err.message : '无法更换背景图')
  }
}

function editBackground() {
  if (!backgroundPath.value) return
  previewBackgroundPath.value = backgroundPath.value
  bgEditDraft.value = normalizeBackgroundConfig({ ...backgroundConfig.value })
  bgEditorAutoFit.value = false
  bgDraftClearsImage.value = false
  bgEditorOpen.value = true
}

function onBackgroundButtonClick() {
  if (hasBackground.value) editBackground()
  else void startBackgroundSetup()
}

async function onBackgroundConfirm(config: PersonalBackgroundConfig) {
  if (bgDraftClearsImage.value) {
    try {
      await window.wanwu.user.clearBackground()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '无法清除背景图')
      return
    }
    backgroundPath.value = null
    backgroundConfig.value = { ...DEFAULT_BACKGROUND_CONFIG }
    backgroundImageSize.value = { width: 0, height: 0 }
    backgroundMediaKey.value = Date.now()
  } else {
    if (previewBackgroundPath.value) {
      backgroundPath.value = previewBackgroundPath.value
      backgroundMediaKey.value = Date.now()
    }
    backgroundConfig.value = normalizeBackgroundConfig(config)
  }
  previewBackgroundPath.value = null
  bgDraftClearsImage.value = false
  bgEditorOpen.value = false
  await persistProfile('背景已应用')
}

function onBackgroundCancel() {
  previewBackgroundPath.value = null
  bgDraftClearsImage.value = false
  bgEditorOpen.value = false
  bgEditDraft.value = normalizeBackgroundConfig({ ...backgroundConfig.value })
}

function onBackgroundReset() {
  previewBackgroundPath.value = null
  bgEditDraft.value = normalizeBackgroundConfig({ ...DEFAULT_BACKGROUND_CONFIG })
  bgDraftClearsImage.value = true
  bgEditorAutoFit.value = false
  backgroundMediaKey.value = Date.now()
}

function openFavorite(itemId: string, source: string) {
  void openItemDetail({ source, id: itemId })
}

async function removeFavorite(itemId: string, source: string, groupId: string) {
  await window.wanwu.user.removeFavorite({ itemId, source })
  const group = groups.value.find((g) => g.id === groupId)
  if (group) {
    group.items = group.items.filter((f) => f.itemId !== itemId)
  }
}
</script>

<template>
  <div
    ref="personalRoot"
    class="ww-personal flex h-full flex-col overflow-hidden"
    :class="{ 'has-bg': hasBackground, 'is-editing-bg': bgEditorOpen }"
  >
    <div
      v-if="backgroundUrl && backgroundStyle"
      class="ww-personal__bg"
      :style="backgroundStyle"
      aria-hidden="true"
    />
    <div v-if="!hasBackground && !bgEditorOpen" class="ww-personal__ambient" aria-hidden="true">
      <span class="ww-personal__pattern" />
      <span class="ww-personal__ambient-glow ww-personal__ambient-glow--warm" />
    </div>

    <ModulePageLayout class="ww-personal__scroll min-h-0 flex-1">
      <template #header>
        <PageHeader title="个人" subtitle="资料与收藏" />
      </template>
      <div class="ww-personal__inner">
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
                    <span
                      v-if="showBioCounter"
                      class="ww-personal-bio__counter"
                      aria-live="polite"
                    >{{ bioLength }}/{{ BIO_MAX }}</span>
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

        <section class="ww-personal-favorites" aria-labelledby="personal-favorites-heading">
          <header class="ww-personal-favorites__head">
            <h2 id="personal-favorites-heading" class="ww-personal-favorites__title">收藏</h2>
            <span v-if="!loading && favoriteCount > 0" class="ww-personal-favorites__count">
              {{ favoriteCount }} 项
            </span>
          </header>

          <div v-if="loading" class="ww-personal-favorites__skeleton">
            <Skeleton v-for="i in 4" :key="i" height="3rem" class="rounded-lg" />
          </div>

          <EmptyState
            v-else-if="favoriteCount === 0"
            variant="empty"
            title="还没有收藏"
            description="在物品详情页点击心形图标，选择分组即可收藏。"
            compact
          />

          <div v-else class="ww-fav-groups">
            <section
              v-for="group in groups.filter((g) => g.items.length)"
              :key="group.id"
              class="ww-fav-group"
              :aria-label="group.name"
            >
              <header class="ww-fav-group__head">
                <WwIcon name="folder-open" size="sm" class="ww-fav-group__icon" />
                <h3 class="ww-fav-group__title">{{ group.name }}</h3>
                <span class="ww-fav-group__count">{{ group.items.length }} 条</span>
              </header>
              <ul class="ww-fav-group__list">
                <li v-for="entry in group.items" :key="entry.id">
                  <FavoriteCard
                    :entry="entry"
                    @open="openFavorite(entry.itemId, entry.source)"
                    @remove="removeFavorite(entry.itemId, entry.source, group.id)"
                  />
                </li>
              </ul>
            </section>
          </div>
        </section>
      </div>
    </ModulePageLayout>

    <ImageViewer
      v-model:open="avatarViewerOpen"
      :slides="avatarViewerSlides"
      :index="0"
    />

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
/* 个人模块 — 简约、轻边框、与全站灰阶一致 */
.ww-personal {
  position: relative;
  background: var(--ww-content);
}

.ww-personal .ww-page-header {
  border-bottom-color: var(--ww-border-faint);
}

.ww-personal.has-bg .ww-page-header {
  background: var(--ww-header-veil);
}

.ww-personal.has-bg .ww-personal__scroll {
  background: rgb(
    var(--ww-scroll-veil-rgb) / calc((1 - var(--ww-personal-bg-opacity, 1)) * 0.48)
  );
}

.ww-personal__bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-repeat: no-repeat;
  background-size: calc(100% * var(--ww-personal-bg-scale, 1));
  background-position: calc(50% + var(--ww-personal-bg-x, 0%)) calc(50% + var(--ww-personal-bg-y, 0%));
  opacity: var(--ww-personal-bg-opacity, 1);
  clip-path: var(--ww-personal-bg-clip, none);
  -webkit-clip-path: var(--ww-personal-bg-clip, none);
}

.ww-personal.is-editing-bg .ww-personal__bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--ww-overlay-scrim);
  pointer-events: none;
}

.ww-personal.is-editing-bg .ww-personal__scroll {
  position: relative;
  z-index: 1;
}

.ww-personal__ambient {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.ww-personal__pattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, var(--ww-grid-dot) 1px, transparent 1px);
  background-size: var(--ww-grid-size) var(--ww-grid-size);
  mask-image: radial-gradient(ellipse 88% 72% at 50% 0%, black 8%, transparent 76%);
  opacity: 0.7;
}

.ww-personal__ambient-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(64px);
  pointer-events: none;
}

.ww-personal__ambient-glow--warm {
  top: -12%;
  left: 8%;
  width: min(26rem, 68vw);
  height: min(16rem, 38vh);
  background: radial-gradient(circle at center, rgb(18 18 22 / 0.035) 0%, transparent 72%);
  opacity: 1;
}

.ww-personal__scroll {
  position: relative;
  z-index: 1;
  background: transparent;
}

.ww-personal__scroll .ww-module-layout__body {
  background: transparent;
}

.ww-personal.has-bg .ww-personal__pattern {
  opacity: 0.35;
}

.ww-personal__inner {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  box-sizing: border-box;
  width: 50%;
  margin-inline: auto;
  padding: 1.125rem 0 2.75rem;
}

.ww-personal-profile__surface > .ww-personal__bg-btn {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  border: 1px solid var(--ww-border-faint);
  border-radius: 0.625rem;
  color: var(--ww-ink-muted);
  background: var(--ww-content);
  cursor: pointer;
  box-shadow: none;
  transition:
    color var(--ww-duration-fast) var(--ww-ease-out),
    background var(--ww-duration-fast) var(--ww-ease-out),
    border-color var(--ww-duration-fast) var(--ww-ease-out),
    transform var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-personal__bg-btn:hover,
.ww-personal__bg-btn:focus-visible {
  color: var(--ww-ink);
  border-color: var(--ww-border-subtle);
  background: var(--ww-inset);
  outline: none;
  transform: translateY(-1px);
}

.ww-personal__bg-btn.is-active {
  color: var(--ww-ink);
  border-color: var(--ww-border-subtle);
  background: var(--ww-list-hover-bg);
}

.ww-personal.has-bg .ww-personal__bg-btn {
  background: var(--ww-glass-bg);
}

/* —— 资料区 —— */
.ww-personal-profile {
  position: relative;
}

.ww-personal-profile__skeleton {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 3rem 1.125rem 1.25rem;
  border: 1px solid var(--ww-border-faint);
  border-radius: 0.75rem;
  background: var(--ww-content);
}

.ww-personal-profile__surface {
  position: relative;
  border: 1px solid var(--ww-border-faint);
  border-radius: 0.75rem;
  background: var(--ww-content);
  animation: ww-personal-enter 0.42s var(--ww-ease-out) both;
}

@keyframes ww-personal-enter {
  from {
    opacity: 0;
    transform: translateY(5px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

.ww-personal.has-bg .ww-personal-profile__surface {
  border-color: var(--ww-glass-border);
  background: var(--ww-surface-float);
}

.ww-personal-profile__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  padding: 2.75rem 1.125rem 1.125rem;
  text-align: center;
}

.ww-personal-profile__avatar {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 5rem;
  height: 5rem;
  font-size: 1.375rem;
  padding: 0;
  border: none;
  border-radius: 50%;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--ww-ink);
  background: var(--ww-inset);
  box-shadow: none;
  cursor: default;
  overflow: visible;
  transition: transform 0.32s var(--ww-ease-out);
}

.ww-personal-profile__avatar-ring {
  position: absolute;
  inset: -4px;
  border: 1px solid var(--ww-border-subtle);
  border-radius: 50%;
  opacity: 0.85;
  transition:
    opacity var(--ww-duration-fast) var(--ww-ease-out),
    transform 0.45s var(--ww-ease-out),
    border-color var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-personal-profile__avatar:hover {
  transform: scale(1.04);
}

.ww-personal-profile__avatar:hover .ww-personal-profile__avatar-ring {
  border-color: rgb(18 18 22 / 0.14);
  transform: scale(1.06);
  opacity: 1;
}

.ww-personal-profile__avatar:focus-visible {
  outline: none;
}

.ww-personal-profile__avatar:focus-visible .ww-personal-profile__avatar-ring {
  box-shadow: var(--ww-focus-ring);
}

.ww-personal-profile__avatar-media {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
}

.ww-personal-profile__avatar-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  opacity: 0;
  transform: scale(1.06);
  transition:
    opacity 0.45s var(--ww-ease-out),
    transform 0.45s var(--ww-ease-out);
}

.ww-personal-profile__avatar-img.is-visible {
  opacity: 1;
  transform: scale(1);
}

.ww-personal-profile__avatar-letter {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
}

.ww-personal-profile__avatar-letter {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.ww-personal-profile__avatar-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border-radius: 50%;
  color: #fff;
  background: rgb(18 18 22 / 0.42);
  opacity: 0;
  transition: opacity var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-personal-profile__avatar:hover .ww-personal-profile__avatar-overlay {
  opacity: 1;
}

.ww-personal-profile__avatar-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  border: none;
  border-radius: 0.25rem;
  color: rgb(255 255 255 / 0.88);
  background: transparent;
  cursor: pointer;
  transition:
    color var(--ww-duration-fast) var(--ww-ease-out),
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.ww-personal-profile__avatar-action:hover {
  color: #fff;
  transform: scale(1.1);
}

.ww-personal-profile__avatar-action:focus-visible {
  outline: none;
  color: #fff;
  box-shadow: 0 0 0 2px rgb(255 255 255 / 0.35);
}

.ww-personal-profile__avatar-action:active {
  transform: scale(0.94);
}

.ww-personal-profile__avatar-action .ww-icon {
  width: 1.125rem;
  height: 1.125rem;
}

/* —— 昵称 —— */
.ww-personal-nickname {
  width: 100%;
  max-width: 20rem;
  margin-top: 0.875rem;
}

.ww-personal-nickname__slot {
  position: relative;
  display: flex;
  justify-content: center;
  width: 100%;
  min-height: 2.125rem;
}

.ww-personal-nickname__display {
  display: inline-flex;
  max-width: 100%;
  padding: 0.25rem 0.375rem;
  border-radius: 0.375rem;
  cursor: text;
  transition: color var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-personal-nickname__display.is-inert {
  visibility: hidden;
  pointer-events: none;
}

.ww-personal-nickname__edit-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ww-nickname-edit-enter-active,
.ww-nickname-edit-leave-active {
  transition: opacity 0.22s var(--ww-ease-out);
}

.ww-nickname-edit-enter-active .ww-personal-nickname__field,
.ww-nickname-edit-leave-active .ww-personal-nickname__field {
  transition:
    opacity 0.22s var(--ww-ease-out),
    transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

.ww-nickname-edit-enter-active .ww-personal-field__actions--inline,
.ww-nickname-edit-leave-active .ww-personal-field__actions--inline {
  transition:
    opacity 0.2s var(--ww-ease-out),
    transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

.ww-nickname-edit-enter-active .ww-personal-field__actions--inline {
  transition-delay: 0.05s;
}

.ww-nickname-edit-enter-from,
.ww-nickname-edit-leave-to {
  opacity: 0;
}

.ww-nickname-edit-enter-from .ww-personal-nickname__field,
.ww-nickname-edit-leave-to .ww-personal-nickname__field {
  opacity: 0;
  transform: scale(0.97);
}

.ww-nickname-edit-enter-from .ww-personal-field__actions--inline,
.ww-nickname-edit-leave-to .ww-personal-field__actions--inline {
  opacity: 0;
  transform: scale(0.9);
}

.ww-personal-nickname__display:hover .ww-personal-nickname__text {
  color: var(--ww-ink);
}

.ww-personal-nickname__display:focus-visible {
  outline: none;
}

.ww-personal-nickname__display:focus-visible .ww-personal-nickname__text {
  text-decoration: underline;
  text-decoration-color: var(--ww-border-subtle);
  text-underline-offset: 0.2em;
}

.ww-personal-nickname__text {
  font-size: 1.0625rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.35;
  color: var(--ww-ink);
  word-break: break-word;
}

.ww-personal-nickname__text.is-placeholder {
  color: var(--ww-ink-muted);
  font-weight: 500;
}

.ww-personal-nickname__measure {
  position: absolute;
  top: 0;
  left: 0;
  display: inline-block;
  visibility: hidden;
  max-width: none;
  padding: 0;
  border: 0;
  white-space: pre;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.35;
  pointer-events: none;
}

.ww-personal-nickname__field {
  position: relative;
  display: inline-flex;
  width: auto;
  max-width: 100%;
  align-items: center;
  transition: width 0.38s cubic-bezier(0.22, 1, 0.36, 1);
}

.ww-personal-nickname__input {
  width: 100%;
  min-width: 0;
  font-size: 1rem !important;
  font-weight: 600;
  text-align: center;
}

.ww-personal-nickname__input.p-inputtext {
  height: 2.125rem !important;
  min-height: 0 !important;
  padding-top: 0.25rem !important;
  padding-right: 2.75rem !important;
  padding-bottom: 0.25rem !important;
  padding-left: 0.625rem !important;
  border: 1px solid var(--ww-border-subtle) !important;
  border-radius: 0.4375rem !important;
  background: var(--ww-content) !important;
  box-shadow: none !important;
  line-height: 1.35 !important;
  box-sizing: border-box !important;
}

.ww-personal-field__actions--inline {
  position: absolute;
  top: 50%;
  right: 0.3125rem;
  gap: 0.125rem;
  transform: translateY(-50%);
}

.ww-personal-nickname__input.p-inputtext:enabled:focus {
  border-color: rgb(18 18 22 / 0.14) !important;
  outline: none !important;
  box-shadow: none !important;
}

/* —— 简介 —— */
.ww-personal-bio-wrap {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  width: 100%;
  max-width: 26rem;
  margin-top: 1.125rem;
}

.ww-personal-bio__label {
  flex-shrink: 0;
  padding-top: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 400;
  line-height: 1.5;
  letter-spacing: normal;
  text-transform: none;
  color: var(--ww-ink-muted);
}

.ww-personal-bio {
  position: relative;
  flex: 1;
  min-width: 0;
}

.ww-personal-bio__input.p-textarea {
  width: 100% !important;
  min-height: 3.25rem;
  padding: 0.5rem 0.625rem 1.75rem !important;
  border: 1px solid var(--ww-border-faint) !important;
  border-radius: 0.5rem !important;
  font-size: 0.8125rem !important;
  line-height: 1.5 !important;
  color: var(--ww-ink) !important;
  background: var(--ww-content) !important;
  box-shadow: none !important;
  resize: none;
  transition:
    border-color var(--ww-duration-fast) var(--ww-ease-out),
    background var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-personal-bio.is-dirty .ww-personal-bio__input.p-textarea,
.ww-personal-bio.is-focused .ww-personal-bio__input.p-textarea,
.ww-personal-bio__input.p-textarea:enabled:focus {
  border-color: var(--ww-border-subtle) !important;
  background: var(--ww-content) !important;
  outline: none !important;
}

.ww-personal-bio__footer {
  position: absolute;
  right: 0.375rem;
  bottom: 0.3125rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.ww-personal-bio__counter {
  font-size: 0.625rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: var(--ww-ink-faint);
  pointer-events: none;
}

/* —— 字段操作（对勾 / 叉） —— */
.ww-personal-field__actions {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.25rem;
}

.ww-personal-field__actions--bio {
  position: static;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-personal-field__actions--bio.is-visible {
  opacity: 1;
  pointer-events: auto;
}

.ww-personal-field__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.375rem;
  height: 1.375rem;
  padding: 0;
  border: none;
  border-radius: 0.25rem;
  color: var(--ww-ink-faint);
  background: transparent;
  cursor: pointer;
  transition:
    color var(--ww-duration-fast) var(--ww-ease-out),
    opacity var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-personal-field__action:hover:not(:disabled),
.ww-personal-field__action:focus-visible:not(:disabled) {
  color: var(--ww-ink);
  outline: none;
}

.ww-personal-field__action--apply:hover:not(:disabled) {
  color: var(--ww-toast-success);
}

.ww-personal-field__action:disabled {
  opacity: 0.28;
  cursor: default;
}

/* —— 背景编辑器（叠加在个人页上，实时预览） —— */
.ww-bg-editor {
  position: absolute;
  inset: 0;
  z-index: 50;
  pointer-events: none;
}

.ww-bg-editor__surface {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
  touch-action: none;
  cursor: grab;
  pointer-events: auto;
}

.ww-bg-editor__surface:active {
  cursor: grabbing;
}

.ww-bg-editor__surface.is-cropping {
  cursor: default;
}

.ww-bg-editor__surface.is-cropping.is-pan-modifier {
  cursor: grab;
}

.ww-bg-editor__surface.is-cropping.is-pan-modifier:active {
  cursor: grabbing;
}

.ww-bg-editor__hint {
  position: absolute;
  top: 0.75rem;
  left: 50%;
  z-index: 2;
  margin: 0;
  padding: 0.375rem 0.875rem;
  border: 1px solid var(--ww-glass-border);
  border-radius: 999px;
  font-size: 0.75rem;
  color: var(--ww-ink-muted);
  background: var(--ww-glass-bg-soft);
  backdrop-filter: blur(12px) saturate(1.35);
  -webkit-backdrop-filter: blur(12px) saturate(1.35);
  box-shadow: var(--ww-shadow-card);
  transform: translateX(-50%);
  pointer-events: none;
}

.ww-bg-editor__crop {
  position: absolute;
  z-index: 4;
  box-sizing: border-box;
  border: 2px solid var(--ww-on-media-fg);
  border-radius: 0.375rem;
  box-shadow: 0 0 0 9999px var(--ww-overlay-scrim);
  cursor: move;
  touch-action: none;
}

.ww-bg-editor__crop-handle {
  position: absolute;
  width: 0.75rem;
  height: 0.75rem;
  border: 2px solid var(--ww-ink);
  border-radius: 0.1875rem;
  background: var(--ww-content);
  touch-action: none;
}

.ww-bg-editor__crop-handle--nw {
  top: -0.3125rem;
  left: -0.3125rem;
  cursor: nwse-resize;
}

.ww-bg-editor__crop-handle--ne {
  top: -0.3125rem;
  right: -0.3125rem;
  cursor: nesw-resize;
}

.ww-bg-editor__crop-handle--sw {
  bottom: -0.3125rem;
  left: -0.3125rem;
  cursor: nesw-resize;
}

.ww-bg-editor__crop-handle--se {
  right: -0.3125rem;
  bottom: -0.3125rem;
  cursor: nwse-resize;
}

.ww-bg-editor__panel {
  position: absolute;
  right: var(--ww-page-padding);
  bottom: 1.25rem;
  z-index: 10;
  display: flex;
  width: min(22rem, calc(100% - 2 * var(--ww-page-padding)));
  flex-direction: column;
  overflow: visible;
  border: 1px solid var(--ww-glass-border);
  border-radius: 0.75rem;
  background: var(--ww-menu-panel-bg, var(--ww-glass-bg));
  backdrop-filter: blur(var(--ww-menu-blur)) saturate(1.35);
  -webkit-backdrop-filter: blur(var(--ww-menu-blur)) saturate(1.35);
  box-shadow: var(--ww-menu-shadow);
  pointer-events: auto;
}

.ww-bg-editor__panel-head {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.875rem 1rem 0.625rem;
  overflow: visible;
  border-bottom: 1px solid var(--ww-border-faint);
  border-radius: 0.75rem 0.75rem 0 0;
}

.ww-bg-editor__panel-head-text {
  min-width: 0;
  flex: 1;
}

.ww-bg-editor__panel-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--ww-ink);
}

.ww-bg-editor__panel-desc {
  margin: 0.25rem 0 0;
  font-size: 0.6875rem;
  line-height: 1.45;
  color: var(--ww-ink-faint);
}

.ww-bg-editor__panel-body {
  overflow: hidden;
  border-radius: 0 0 0.75rem 0.75rem;
}

.ww-bg-editor__panel-body .ww-settings-row {
  padding: 0.6875rem 1rem;
}

.ww-bg-editor__panel-body .ww-settings-row__label {
  flex: 0 0 5.25rem;
  max-width: 5.25rem;
}

.ww-bg-editor__panel-body .ww-bg-editor__crop-row .ww-settings-row__label {
  flex: 1 1 auto;
  max-width: none;
  min-width: 0;
}

.ww-bg-editor__panel-body .ww-bg-editor__crop-row .ww-settings-row__subtitle {
  white-space: nowrap;
}

.ww-bg-editor__slider-field {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  max-width: 13.5rem;
}

.ww-bg-editor__slider-field .ww-bg-editor__slider {
  flex: 1;
  min-width: 0;
}

.ww-bg-editor__value {
  flex-shrink: 0;
  min-width: 2.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: var(--ww-ink-muted);
}

.ww-bg-editor__toggle-field {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.375rem;
}

.ww-bg-editor__panel-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ww-action-btn-gap);
  padding: 0.625rem 1rem 0.75rem;
  border-top: 1px solid var(--ww-border-faint);
}

.ww-bg-editor__panel-foot-start {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ww-action-btn-gap);
}

.ww-bg-editor__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--ww-action-btn-h);
  height: var(--ww-action-btn-h);
  padding: 0;
  border: none;
  border-radius: 0.3125rem;
  color: var(--ww-ink-muted);
  background: var(--ww-glass-bg);
  cursor: pointer;
  transition:
    color var(--ww-duration-fast) var(--ww-ease-out),
    background var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-bg-editor__icon-btn:hover,
.ww-bg-editor__icon-btn:focus-visible {
  color: var(--ww-ink);
  background: var(--ww-glass-bg-soft);
  outline: none;
}

.ww-bg-editor__icon-btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
  pointer-events: none;
}

.ww-bg-editor__panel-actions .p-button {
  height: var(--ww-action-btn-h);
  min-height: var(--ww-action-btn-h);
  padding: 0 var(--ww-action-btn-px);
  font-size: var(--ww-action-btn-fs);
  font-weight: 500;
  line-height: 1;
  gap: 0.25rem;
}

.ww-bg-editor__panel-actions .p-button .ww-icon {
  width: 0.75rem;
  height: 0.75rem;
}

.ww-bg-editor__panel-actions {
  display: flex;
  align-items: center;
  gap: var(--ww-action-btn-gap);
  flex-shrink: 0;
}

.ww-bg-editor .p-slider {
  height: 0.375rem;
  background: var(--ww-inset) !important;
}

.ww-bg-editor .p-slider .p-slider-range {
  background: var(--ww-ink) !important;
  transition: width var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-bg-editor .p-slider .p-slider-handle {
  width: 0.875rem;
  height: 0.875rem;
  margin-block-start: -0.4375rem !important;
  margin-inline-start: -0.4375rem !important;
  border: 2px solid var(--ww-elevated) !important;
  background: var(--ww-ink) !important;
  box-shadow: var(--ww-shadow-soft) !important;
  transition:
    left var(--ww-duration-fast) var(--ww-ease-out),
    transform var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-bg-editor .p-slider .p-slider-handle:hover {
  transform: scale(1.06);
}

.ww-bg-editor .p-toggleswitch.p-toggleswitch-checked .p-toggleswitch-slider {
  background: var(--ww-ink) !important;
}

/* 操作说明（样式参考大图浏览器） */
.ww-bg-editor__help {
  position: relative;
  flex-shrink: 0;
}

.ww-bg-editor__help-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: 0.375rem;
  color: var(--ww-ink-muted);
  background: var(--ww-glass-bg);
  cursor: default;
  transition:
    color var(--ww-duration-fast) var(--ww-ease-out),
    background var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-bg-editor__help-trigger:hover,
.ww-bg-editor__help-trigger:focus-visible {
  color: var(--ww-ink);
  background: var(--ww-glass-bg-soft);
  outline: none;
}

/* Teleport 到 body 后用 fixed 定位；脱离 panel 的 backdrop root，模糊才生效 */
.ww-bg-editor__help-popover {
  position: fixed;
  z-index: 1500;
  width: max-content;
  min-width: 11.75rem;
  max-width: 15.5rem;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--ww-glass-border);
  border-radius: 0.75rem;
  background: var(--ww-glass-bg-soft);
  backdrop-filter: blur(22px) saturate(1.6);
  -webkit-backdrop-filter: blur(22px) saturate(1.6);
  box-shadow: var(--ww-help-popover-shadow);
  transform-origin: top right;
  pointer-events: auto;
}

.ww-bg-editor-help-enter-active,
.ww-bg-editor-help-leave-active {
  transition:
    opacity 0.18s var(--ww-ease-out),
    transform 0.22s var(--ww-ease-out);
}

.ww-bg-editor-help-enter-from,
.ww-bg-editor-help-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

.ww-bg-editor__help-title {
  margin: 0 0 0.5rem;
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ww-ink-faint);
}

.ww-bg-editor__help-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ww-bg-editor__help-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.875rem;
}

.ww-bg-editor__help-keys {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.ww-bg-editor__help-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.375rem;
  padding: 0.125rem 0.3125rem;
  border: 1px solid var(--ww-border-subtle);
  border-radius: 0.25rem;
  background: var(--ww-inset);
  font-family: inherit;
  font-size: 0.625rem;
  font-weight: 500;
  line-height: 1.3;
  color: var(--ww-ink);
}

.ww-bg-editor__help-label {
  font-size: 0.6875rem;
  line-height: 1.35;
  color: var(--ww-ink-muted);
  white-space: nowrap;
}

/* —— 收藏 —— */
.ww-personal-favorites__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.875rem;
  padding-bottom: 0.625rem;
  border-bottom: 1px solid var(--ww-border-faint);
}

.ww-personal-favorites__title {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: normal;
  text-transform: none;
  color: var(--ww-ink);
}

.ww-personal-favorites__count {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--ww-ink-faint);
}

.ww-personal-favorites__skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.ww-fav-groups {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.ww-fav-group__head {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.375rem;
  padding: 0 0.125rem;
}

.ww-fav-group__icon {
  color: var(--ww-ink-faint);
  opacity: 0.65;
}

.ww-fav-group__title {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ww-ink);
}

.ww-fav-group__count {
  flex-shrink: 0;
  margin-left: auto;
  font-size: 0.6875rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--ww-ink-faint);
}

.ww-fav-group__list {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--ww-border-subtle);
  border-radius: 0.625rem;
  background: var(--ww-elevated);
  overflow: hidden;
}

.ww-personal.has-bg .ww-fav-group__list {
  background: var(--ww-surface-float);
  border-color: var(--ww-glass-border);
}

.ww-fav-group__list > li + li {
  border-top: 1px solid var(--ww-border-faint);
}

/* —— 收藏行 —— */
.ww-favorite-row {
  display: flex;
  align-items: stretch;
  gap: 0;
  border-radius: 0;
  background: transparent;
  transition: background var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-favorite-row:hover:not(.ww-favorite-row--muted) {
  background: var(--ww-list-hover-bg);
}

.ww-favorite-row--muted {
  opacity: 0.65;
}

.ww-favorite-row__main {
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5625rem 0.375rem 0.5625rem 0.625rem;
  border: none;
  border-radius: 0;
  text-align: left;
  background: transparent;
  cursor: pointer;
}

.ww-favorite-row__main:disabled {
  cursor: default;
}

.ww-favorite-row__main:focus-visible {
  outline: none;
  box-shadow: inset var(--ww-focus-ring);
}

.ww-favorite-row__thumb {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  overflow: hidden;
  border: 1px solid var(--ww-border-faint);
  border-radius: 0.375rem;
  background: var(--ww-inset);
}

.ww-favorite-row__thumb .ww-cover-image__img,
.ww-favorite-row__thumb .ww-cover-image__placeholder {
  width: 100%;
  height: 100%;
  border-radius: inherit;
}

.ww-favorite-row__thumb .ww-cover-image__placeholder-text {
  display: none;
}

.ww-favorite-row__text {
  flex: 1;
  min-width: 0;
}

.ww-favorite-row__title {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--ww-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ww-favorite-row__meta {
  margin: 0.125rem 0 0;
  font-size: 0.6875rem;
  color: var(--ww-ink-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ww-favorite-row__chevron {
  flex-shrink: 0;
  color: var(--ww-ink-faint);
  opacity: 0.45;
  transition: opacity var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-favorite-row:hover:not(.ww-favorite-row--muted) .ww-favorite-row__chevron {
  opacity: 0.85;
}

.ww-favorite-row__remove {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  align-self: center;
  width: 1.75rem;
  height: 1.75rem;
  margin-right: 0.25rem;
  border: none;
  border-radius: 0.375rem;
  color: var(--ww-ink-faint);
  background: transparent;
  cursor: pointer;
  opacity: 0;
  transition:
    opacity var(--ww-duration-fast) var(--ww-ease-out),
    color var(--ww-duration-fast) var(--ww-ease-out),
    background var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-favorite-row:hover .ww-favorite-row__remove {
  opacity: 1;
}

.ww-favorite-row__remove:hover {
  color: var(--ww-ink);
  background: var(--ww-list-hover-bg);
}

.ww-favorite-list-enter-active,
.ww-favorite-list-leave-active {
  transition:
    opacity var(--ww-duration) var(--ww-ease-out),
    transform var(--ww-duration) var(--ww-ease-out);
}

.ww-favorite-list-enter-from,
.ww-favorite-list-leave-to {
  opacity: 0;
  transform: translateX(-6px);
}

.ww-favorite-list-move {
  transition: transform var(--ww-duration-slow) var(--ww-ease-out-slow);
}

@media (prefers-reduced-motion: reduce) {
  .ww-personal__ambient-glow--warm,
  .ww-personal-profile__surface,
  .ww-personal-profile__avatar,
  .ww-personal-profile__avatar-ring {
    animation: none;
    transition: none;
  }

  .ww-personal-profile__avatar:hover {
    transform: none;
  }

  .ww-favorite-list-enter-active,
  .ww-favorite-list-leave-active,
  .ww-favorite-list-move {
    transition: none;
  }
}
</style>
