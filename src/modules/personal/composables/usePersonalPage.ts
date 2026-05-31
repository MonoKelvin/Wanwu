import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useItemDetailNavigation } from '@app/composables/useItemDetailNavigation'
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
import type { ImageViewerSlide } from '@shared/types/image-viewer'

export function usePersonalPage() {
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
const nicknameInputRef = ref<{ $el?: HTMLElement } | null>(null)
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
  return {
    NICKNAME_MAX,
    BIO_MAX,
    personalRoot,
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
    avatarViewerOpen,
    avatarPath,
    backgroundPath,
    backgroundConfig,
    groups,
    bgEditorOpen,
    bgEditorAutoFit,
    bgEditDraft,
    profileInitial,
    displayNickname,
    nicknameIsPlaceholder,
    bioDirty,
    showBioActions,
    showBioCounter,
    bioLength,
    nicknameFieldStyle,
    avatarUrl,
    avatarViewerSlides,
    backgroundUrl,
    backgroundStyle,
    hasBackground,
    favoriteCount,
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
    onBackgroundButtonClick,
    onBackgroundConfirm,
    onBackgroundCancel,
    onBackgroundReset,
    replaceBackground,
    openFavorite,
    removeFavorite
  }
}
