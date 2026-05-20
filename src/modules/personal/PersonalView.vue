<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Skeleton from 'primevue/skeleton'
import WwButton from '@shared/components/WwButton.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import PageHeader from '@app/components/PageHeader.vue'
import EmptyState from '@app/components/EmptyState.vue'
import FavoriteCard from '@features/personal/FavoriteCard.vue'
import PersonalBackgroundEditor from '@features/personal/PersonalBackgroundEditor.vue'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import type { PersonalBackgroundConfig } from '@shared/types/profile'
import { DEFAULT_BACKGROUND_CONFIG } from '@shared/types/profile'
import {
  backgroundLayerStyle,
  loadImageDimensions,
  normalizeBackgroundConfig,
  toWanwuMediaUrl
} from '@shared/utils/profileMedia'
import type { FavoriteGroup } from '@shared/types/favorite'

const router = useRouter()
const toast = useWanwuToast()

const nickname = ref('')
const bio = ref('')
const avatarPath = ref<string | null>(null)
const avatarMediaKey = ref(0)
const backgroundPath = ref<string | null>(null)
/** 编辑会话中的预览路径，仅在点击「应用」后写入 backgroundPath */
const previewBackgroundPath = ref<string | null>(null)
const backgroundMediaKey = ref(0)
const backgroundConfig = ref<PersonalBackgroundConfig>({ ...DEFAULT_BACKGROUND_CONFIG })
const groups = ref<FavoriteGroup[]>([])
const loading = ref(true)
const saving = ref(false)
const saved = ref(false)
const bgEditorOpen = ref(false)
const bgEditorAutoFit = ref(false)
/** 恢复默认后点击「应用」时清除已保存的背景图 */
const bgDraftClearsImage = ref(false)
const bgEditDraft = ref<PersonalBackgroundConfig>({ ...DEFAULT_BACKGROUND_CONFIG })
const personalRoot = ref<HTMLElement | null>(null)
const backgroundImageSize = ref({ width: 0, height: 0 })
const viewportSize = ref({ width: 0, height: 0 })

const profileInitial = computed(() => {
  const n = nickname.value.trim()
  if (!n) return '?'
  return n.slice(0, 1).toUpperCase()
})

const avatarUrl = computed(() =>
  toWanwuMediaUrl(avatarPath.value, avatarMediaKey.value || undefined)
)

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

const hasBackground = computed(() => Boolean(backgroundUrl.value))

const favoriteCount = computed(() =>
  groups.value.reduce((sum, g) => sum + g.items.length, 0)
)

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
})

async function save() {
  saving.value = true
  try {
    await window.wanwu.user.updateProfile({
      nickname: nickname.value,
      bio: bio.value,
      avatarPath: avatarPath.value,
      backgroundPath: backgroundPath.value,
      backgroundConfig: backgroundConfig.value
    })
    saved.value = true
    setTimeout(() => {
      saved.value = false
    }, 2400)
    toast.success('资料已保存')
  } finally {
    saving.value = false
  }
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
  await save()
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
  router.push({ name: 'item-detail', params: { source, id: itemId } })
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
      <span class="ww-personal__ambient-glow ww-personal__ambient-glow--warm" />
      <span class="ww-personal__ambient-glow ww-personal__ambient-glow--cool" />
    </div>

    <PageHeader title="个人" subtitle="资料与收藏" />

    <div class="ww-scroll-main ww-personal__scroll">
      <div class="ww-personal__inner">
        <section class="ww-personal-profile" aria-labelledby="personal-profile-heading">
          <div v-if="loading" class="ww-personal-profile__skeleton">
            <Skeleton shape="circle" size="4.25rem" />
            <div class="flex-1">
              <Skeleton width="40%" height="1rem" class="mb-3" />
              <Skeleton width="100%" height="2.25rem" class="mb-3" />
              <Skeleton width="100%" height="4.5rem" />
            </div>
          </div>

          <div v-else class="ww-personal-profile__body">
            <button
              type="button"
              class="ww-personal-profile__avatar"
              aria-label="更换头像"
              @click="pickAvatar"
            >
              <img v-if="avatarUrl" :src="avatarUrl" alt="" class="ww-personal-profile__avatar-img" />
              <span v-else class="ww-personal-profile__avatar-letter">{{ profileInitial }}</span>
            </button>
            <div class="ww-personal-profile__fields">
              <h2 id="personal-profile-heading" class="ww-personal-profile__heading">个人资料</h2>
              <div class="ww-personal-field">
                <label for="nickname" class="ww-personal-field__label">昵称</label>
                <InputText
                  id="nickname"
                  v-model="nickname"
                  placeholder="万物探索者"
                  class="ww-personal-field__input w-full"
                />
              </div>
              <div class="ww-personal-field">
                <label for="bio" class="ww-personal-field__label">简介</label>
                <Textarea
                  id="bio"
                  v-model="bio"
                  class="ww-personal-field__input w-full"
                  rows="3"
                  auto-resize
                  placeholder="写一句关于自己的介绍…"
                />
              </div>

              <div class="ww-personal-profile__toolbar">
                <WwButton
                  icon="save"
                  size="small"
                  severity="secondary"
                  outlined
                  :loading="saving"
                  aria-label="保存资料"
                  v-tooltip.bottom="'保存资料'"
                  @click="save"
                />
                <WwButton
                  icon="image"
                  size="small"
                  severity="secondary"
                  outlined
                  :class="{ 'is-active': hasBackground }"
                  :aria-label="hasBackground ? '调整页面背景' : '设置页面背景'"
                  v-tooltip.bottom="hasBackground ? '调整页面背景' : '设置页面背景'"
                  @click="onBackgroundButtonClick"
                />
                <Transition name="ww-personal-save-hint">
                  <span v-if="saved" class="ww-personal-profile__saved" role="status" aria-live="polite">
                    <WwIcon name="check" size="xs" />
                  </span>
                </Transition>
              </div>
            </div>
          </div>
        </section>

        <section class="ww-personal-favorites" aria-labelledby="personal-favorites-heading">
          <header class="ww-personal-favorites__head">
            <h2 id="personal-favorites-heading" class="ww-section-label">收藏</h2>
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
    </div>

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
