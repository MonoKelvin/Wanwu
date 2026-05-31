<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import InputText from 'primevue/inputtext'
import WwButton from '@shared/components/WwButton.vue'
import WwGlassDialog from '@shared/components/WwGlassDialog.vue'
import { useMusicLoginFlow } from '@modules/music/composables/useMusicLoginFlow'
import type { MusicNeteaseLoginStatus } from '@shared/types/music'
import '@modules/music/styles/music-login.css'

const visible = defineModel<boolean>('visible', { default: false })
const emit = defineEmits<{ success: [] }>()

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

async function refreshStatus() {
  status.value = await window.wanwu.music.neteaseGetLoginStatus()
}

async function startQrLogin() {
  if (loginComplete.value) return
  loading.value = true
  message.value = null
  try {
    const qr = await window.wanwu.music.neteaseLoginQrKey()
    qrKey.value = qr.key
    qrImage.value = qr.qrImageBase64?.startsWith('data:')
      ? qr.qrImageBase64
      : qr.qrImageBase64
        ? `data:image/png;base64,${qr.qrImageBase64}`
        : ''
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
    const res = await window.wanwu.music.neteaseLoginQrCheck(qrKey.value)
    if (res.status === 803) {
      stopPoll()
      loginComplete.value = true
      qrImage.value = ''
      await refreshStatus()
      finishSuccess()
    } else if (res.status === 800) {
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
    await window.wanwu.music.neteaseSendCaptcha(phone.value.trim())
    finishInfo('验证码已发送')
  } catch (e) {
    finishError(e instanceof Error ? e.message : '发送失败')
  }
}

async function loginPhone() {
  loading.value = true
  message.value = null
  try {
    await window.wanwu.music.neteaseLoginPhone(phone.value.trim(), captcha.value.trim())
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
    const musicU =
      cookieText.value.includes('MUSIC_U=')
        ? (cookieText.value.match(/MUSIC_U=([^;]+)/)?.[1] ?? cookieText.value.trim())
        : cookieText.value.trim()
    status.value = await window.wanwu.music.neteaseLoginCookie(musicU)
    loginComplete.value = true
    finishSuccess()
  } catch (e) {
    finishError(e instanceof Error ? e.message : 'Cookie 无效')
  }
}

async function logout() {
  await window.wanwu.music.neteaseLogout()
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

onUnmounted(stopPoll)
</script>

<template>
  <WwGlassDialog
    :visible="visible"
    header="网易云音乐登录"
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
          Cookie
        </button>
      </div>

      <div v-if="!status.loggedIn && tab === 'qr'" key="qr" class="ww-music-login__panel ww-music-login__qr">
        <div class="ww-music-login__qr-frame" :class="{ 'is-loading': loading && !qrImage && !loginComplete }">
          <img v-if="qrImage" :src="qrImage" alt="登录二维码" class="ww-music-login__qr-img" />
          <p v-else class="ww-music-login__qr-empty">{{ loading ? '加载二维码…' : '暂无二维码' }}</p>
        </div>
        <WwButton variant="ghost" size="sm" :disabled="loading" @click="startQrLogin">刷新二维码</WwButton>
      </div>

      <div v-else-if="!status.loggedIn && tab === 'phone'" key="phone" class="ww-music-login__panel ww-music-login__form">
        <div class="ww-music-login__field">
          <InputText v-model="phone" placeholder="手机号" class="w-full" />
        </div>
        <div class="ww-music-login__row">
          <div class="ww-music-login__field flex-1">
            <InputText v-model="captcha" placeholder="验证码" class="w-full" />
          </div>
          <WwButton variant="secondary" size="sm" :disabled="loading" @click="sendCaptcha">发送</WwButton>
        </div>
        <WwButton :disabled="loading" @click="loginPhone">登录</WwButton>
      </div>

      <div v-else-if="!status.loggedIn" key="cookie" class="ww-music-login__panel ww-music-login__form">
        <div class="ww-music-login__field">
          <InputText v-model="cookieText" placeholder="粘贴 MUSIC_U 或完整 Cookie" class="w-full" />
        </div>
        <WwButton :disabled="loading" @click="loginCookie">确认登录</WwButton>
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
      <WwButton v-if="status.loggedIn" variant="ghost" @click="logout">退出登录</WwButton>
      <WwButton variant="secondary" class="ww-dialog-footer__btn--cancel" @click="visible = false">
        关闭
      </WwButton>
    </template>
  </WwGlassDialog>
</template>
