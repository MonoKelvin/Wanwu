<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import InputText from 'primevue/inputtext'
import WwButton from '@shared/components/WwButton.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import WwGlassDialog from '@shared/components/WwGlassDialog.vue'
import { useMusicLoginFlow } from '@modules/music/composables/useMusicLoginFlow'
import { useSettingsStore } from '@shared/stores/settings'
import type { MusicNeteaseLoginStatus } from '@modules/music/domain/types'
import '@modules/music/styles/music-login.css'

const visible = defineModel<boolean>('visible', { default: false })
const emit = defineEmits<{ success: [] }>()

const props = withDefaults(
  defineProps<{
    platform?: 'netease' | 'kugou'
  }>(),
  {}
)

const { settings } = storeToRefs(useSettingsStore())

const activePlatform = computed<'netease' | 'kugou'>(() => {
  if (props.platform) return props.platform
  return settings.value.musicPrimarySource === 'kugou' ? 'kugou' : 'netease'
})

const platformLabel = computed(() => (activePlatform.value === 'kugou' ? '酷狗音乐' : '网易云音乐'))
const cookiePlaceholder = computed(() =>
  activePlatform.value === 'kugou' ? '粘贴 token 或完整 Cookie' : '粘贴 MUSIC_U 或完整 Cookie'
)
const cookieTabLabel = computed(() => (activePlatform.value === 'kugou' ? 'Token' : 'Cookie'))

const tab = ref<'qr' | 'phone' | 'cookie'>('qr')
const status = ref<MusicNeteaseLoginStatus>({ loggedIn: false, loginType: 'none' })
const qrImage = ref('')
const qrKey = ref('')
const phone = ref('')
const captcha = ref('')
const cookieText = ref('')
const loading = ref(false)
const message = ref<string | null>(null)
const loginComplete = ref(false)

let pollTimer: ReturnType<typeof setInterval> | null = null

const { finishSuccess, finishError, finishInfo } = useMusicLoginFlow({
  visible,
  loading,
  message,
  emit
})

const loggedInLabel = computed(() =>
  status.value.loggedIn ? status.value.nickname ?? `用户 ${status.value.userId}` : '未登录'
)

const messageTone = computed(() => {
  if (!message.value) return null
  if (/成功|已发送|已退出/.test(message.value)) return 'success'
  if (/失败|无效|过期|错误/.test(message.value)) return 'error'
  return null
})

function resolveQrSrc(raw: string): string {
  if (!raw) return ''
  if (raw.startsWith('data:') || raw.startsWith('http')) return raw
  return `data:image/png;base64,${raw}`
}

function qrSuccessStatus(code: number): boolean {
  return activePlatform.value === 'kugou' ? code === 4 : code === 803
}

function qrExpiredStatus(code: number): boolean {
  return activePlatform.value === 'kugou' ? code === 0 : code === 800
}

async function refreshStatus() {
  status.value = await window.wanwu.music.getPlatformLoginStatus()
}

async function startQrLogin() {
  if (loginComplete.value) return
  loading.value = true
  message.value = null
  try {
    const qr = await window.wanwu.music.platformLoginQrKey()
    qrKey.value = qr.key
    qrImage.value = resolveQrSrc(qr.qrImageBase64 ?? qr.qrUrl)
    stopPoll()
    pollTimer = setInterval(() => void pollQr(), 2000)
  } catch (e) {
    finishError(e instanceof Error ? e.message : '二维码获取失败')
  } finally {
    if (!loginComplete.value) loading.value = false
  }
}

async function pollQr() {
  if (!qrKey.value || loginComplete.value) return
  try {
    const res = await window.wanwu.music.platformLoginQrCheck(qrKey.value)
    if (qrSuccessStatus(res.status)) {
      stopPoll()
      loginComplete.value = true
      qrImage.value = ''
      await refreshStatus()
      finishSuccess()
    } else if (qrExpiredStatus(res.status)) {
      finishInfo('二维码过期，请刷新')
      stopPoll()
    }
  } catch {
    /* ignore poll errors */
  }
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

async function sendCaptcha() {
  if (!phone.value.trim()) return
  loading.value = true
  message.value = null
  try {
    await window.wanwu.music.platformSendCaptcha(phone.value.trim())
    finishInfo('验证码已发送')
  } catch (e) {
    finishError(e instanceof Error ? e.message : '发送失败')
  }
}

async function loginPhone() {
  loading.value = true
  message.value = null
  try {
    await window.wanwu.music.platformLoginPhone(phone.value.trim(), captcha.value.trim())
    loginComplete.value = true
    await refreshStatus()
    finishSuccess()
  } catch (e) {
    finishError(e instanceof Error ? e.message : '登录失败')
  }
}

async function loginCookie() {
  loading.value = true
  message.value = null
  try {
    let credential = cookieText.value.trim()
    if (activePlatform.value === 'kugou') {
      credential = cookieText.value.includes('token=')
        ? (cookieText.value.match(/token=([^;]+)/)?.[1] ?? credential)
        : credential
    } else {
      credential = cookieText.value.includes('MUSIC_U=')
        ? (cookieText.value.match(/MUSIC_U=([^;]+)/)?.[1] ?? credential)
        : credential
    }
    status.value = await window.wanwu.music.platformLoginCookie(credential)
    if (!status.value.loggedIn) {
      finishError('凭证无效或已过期')
      return
    }
    loginComplete.value = true
    finishSuccess()
  } catch (e) {
    finishError(e instanceof Error ? e.message : '凭证无效')
  }
}

const showFooterLogin = computed(
  () => !status.value.loggedIn && (tab.value === 'phone' || tab.value === 'cookie')
)

function submitLogin() {
  if (tab.value === 'phone') void loginPhone()
  else if (tab.value === 'cookie') void loginCookie()
}

async function logout() {
  await window.wanwu.music.platformLogout()
  loginComplete.value = false
  await refreshStatus()
  finishInfo('已退出')
}

watch(visible, (open) => {
  if (open) {
    loginComplete.value = false
    void refreshStatus()
    if (tab.value === 'qr') void startQrLogin()
  } else {
    stopPoll()
    message.value = null
  }
})

watch(tab, (t) => {
  if (loginComplete.value) return
  if (t === 'qr' && visible.value) void startQrLogin()
  else stopPoll()
})

watch(activePlatform, () => {
  if (visible.value && tab.value === 'qr' && !loginComplete.value) void startQrLogin()
})

onUnmounted(stopPoll)
</script>

<template>
  <WwGlassDialog
    :visible="visible"
    :header="`${platformLabel}登录`"
    width-class="w-[min(26rem,92vw)]"
    @update:visible="visible = $event"
  >
    <div class="ww-music-login">
      <div v-if="status.loggedIn" class="ww-music-login__status is-online">
        <span class="ww-music-login__status-dot" aria-hidden="true" />
        <p class="ww-music-login__status-text">
          已登录：<strong>{{ loggedInLabel }}</strong>
        </p>
      </div>
      <p v-else class="ww-music-login__hint">扫码或手机号登录，用于日推、收藏等账号能力。</p>

      <div v-if="!status.loggedIn" class="ww-music-login__tabs" role="tablist" aria-label="登录方式">
        <button
          type="button"
          role="tab"
          class="ww-music-login__tab"
          :class="{ 'is-active': tab === 'qr' }"
          @click="tab = 'qr'"
        >
          扫码
        </button>
        <button
          type="button"
          role="tab"
          class="ww-music-login__tab"
          :class="{ 'is-active': tab === 'phone' }"
          @click="tab = 'phone'"
        >
          手机
        </button>
        <button
          type="button"
          role="tab"
          class="ww-music-login__tab"
          :class="{ 'is-active': tab === 'cookie' }"
          @click="tab = 'cookie'"
        >
          {{ cookieTabLabel }}
        </button>
      </div>

      <div v-if="!status.loggedIn && tab === 'qr'" key="qr" class="ww-music-login__panel ww-music-login__qr">
        <div
          class="ww-music-login__qr-frame"
          :class="{
            'is-loading': loading && !qrImage && !loginComplete,
            'is-refreshable': !loginComplete && (qrImage || !loading)
          }"
        >
          <img v-if="qrImage" :src="qrImage" alt="登录二维码" class="ww-music-login__qr-img" />
          <p v-else class="ww-music-login__qr-empty">{{ loading ? '加载二维码…' : '暂无二维码' }}</p>
          <div v-if="qrImage" class="ww-music-login__qr-dim" aria-hidden="true" />
          <button
            v-if="!loginComplete && (qrImage || !loading)"
            type="button"
            class="ww-music-login__qr-refresh"
            :disabled="loading"
            aria-label="刷新二维码"
            @click="startQrLogin"
          >
            <span class="ww-music-login__qr-refresh-glass">
              <WwIcon name="refresh-cw" :size="22" />
            </span>
          </button>
        </div>
      </div>

      <div v-else-if="!status.loggedIn && tab === 'phone'" key="phone" class="ww-music-login__panel ww-music-login__form">
        <div class="ww-music-login__field">
          <InputText v-model="phone" placeholder="手机号" class="w-full" />
        </div>
        <div class="ww-music-login__field ww-music-login__field--with-action">
          <InputText v-model="captcha" placeholder="验证码" class="w-full" />
          <button
            type="button"
            class="ww-music-login__field-action"
            :disabled="loading || !phone.trim()"
            aria-label="发送验证码"
            @click="sendCaptcha"
          >
            <WwIcon name="arrow-right" size="sm" />
          </button>
        </div>
      </div>

      <div v-else-if="!status.loggedIn" key="cookie" class="ww-music-login__panel ww-music-login__form">
        <div class="ww-music-login__field">
          <InputText v-model="cookieText" :placeholder="cookiePlaceholder" class="w-full" />
        </div>
      </div>

      <p
        v-if="message"
        class="ww-music-login__message"
        :class="{ 'is-success': messageTone === 'success', 'is-error': messageTone === 'error' }"
      >
        {{ message }}
      </p>
    </div>

    <template #footer>
      <WwButton
        v-if="status.loggedIn"
        variant="ghost"
        class="ww-music-login__footer-logout"
        @click="logout"
      >
        退出登录
      </WwButton>
      <WwButton variant="secondary" class="ww-dialog-footer__btn--cancel" @click="visible = false">
        关闭
      </WwButton>
      <WwButton v-if="showFooterLogin" label="登录" :disabled="loading" :loading="loading" @click="submitLogin" />
    </template>
  </WwGlassDialog>
</template>
