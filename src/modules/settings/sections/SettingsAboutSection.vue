<script setup lang="ts">
import { ref } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'
import WwRollingText from '@shared/components/WwRollingText.vue'
import { useAppLogo } from '@shared/composables/useAppLogo'
import { formatAppVersionLabel } from '@shared/constants/appVersion'
import SettingsAboutHeroFx from '@modules/settings/SettingsAboutHeroFx.vue'

const props = defineProps<{
  visible?: boolean
}>()

const { about: appLogoAbout } = useAppLogo()
const appVersion = formatAppVersionLabel()
const heroHover = ref(false)
const copyrightYear = new Date().getFullYear()
const githubUrl = 'https://github.com/MonoKelvin/Wanwu'

const appIntroLead =
  '万物是安装在您电脑上的桌面软件，帮您把日常内容和兴趣资料集中整理、随时打开使用。'

const appIntroPoints = [
  '全库：写便笺、收藏链接、画流程图、浏览图鉴',
  'RSS：订阅网站资讯，在软件内阅读',
  '音乐：搜索与播放歌曲（部分功能需登录对应平台）',
  '个人空间：管理收藏与简单资料'
]

const appIntroFooter = '数据保存在本机，不联网也能查看已保存的内容。'

const developers = [
  { name: 'Cursor', href: 'https://cursor.com', note: 'AI 辅助设计与开发' },
  { name: 'MonoKelvin', href: 'https://github.com/MonoKelvin', note: 'MonoStudio 创始人 · 产品与工程' }
]
</script>

<template>
  <div class="ww-settings-section ww-settings-section--about">
    <div
      class="ww-settings-about-hero"
      @mouseenter="heroHover = true"
      @mouseleave="heroHover = false"
    >
      <SettingsAboutHeroFx :active="heroHover" :visible="props.visible ?? false" />
      <div class="ww-settings-about-hero__content">
        <img :src="appLogoAbout" width="56" height="56" alt="" class="ww-settings-about-hero__logo" />
        <div class="ww-settings-about-hero__main">
          <h2 class="ww-settings-about-hero__name">万物（Wanwu）</h2>
          <p class="ww-settings-about-hero__subtitle">
            © {{ copyrightYear }} <strong>MonoStudio</strong>. 保留所有权利。
          </p>
        </div>
        <span class="ww-settings-about-hero__version">
          <WwRollingText :text="appVersion" :active="heroHover" />
        </span>
      </div>
    </div>

    <div class="ww-settings-group">
      <h3 class="ww-settings-group__label">软件简介</h3>
      <div class="ww-settings-prose ww-settings-about-intro">
        <p>{{ appIntroLead }}</p>
        <ul class="ww-settings-about-intro__list">
          <li v-for="item in appIntroPoints" :key="item">{{ item }}</li>
        </ul>
        <p>{{ appIntroFooter }}</p>
      </div>
    </div>

    <div class="ww-settings-group">
      <h3 class="ww-settings-group__label">开发者</h3>
      <ul class="ww-settings-dev-list">
        <li v-for="dev in developers" :key="dev.name">
          <a :href="dev.href" target="_blank" rel="noopener noreferrer" class="ww-settings-dev-link">
            <span class="ww-settings-dev-link__name">{{ dev.name }}</span>
            <span class="ww-settings-dev-link__note">{{ dev.note }}</span>
            <WwIcon name="external-link" size="xs" />
          </a>
        </li>
      </ul>
    </div>

    <a
      :href="githubUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="ww-settings-repo-link"
    >
      <WwIcon name="github" size="md" class="ww-settings-repo-link__icon" />
      <span class="ww-settings-repo-link__url">{{ githubUrl }}</span>
    </a>
  </div>
</template>
