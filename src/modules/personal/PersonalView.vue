<script setup lang="ts">
import { onMounted, ref } from 'vue'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import WwButton from '@shared/components/WwButton.vue'
import Badge from 'primevue/badge'
import PageHeader from '@app/components/PageHeader.vue'

const nickname = ref('')
const bio = ref('')
const favorites = ref<unknown[]>([])
const saved = ref(false)

onMounted(async () => {
  const profile = await window.wanwu.user.getProfile()
  if (profile) {
    nickname.value = profile.nickname
    bio.value = profile.bio
  }
  favorites.value = await window.wanwu.user.listFavorites()
})

async function save() {
  await window.wanwu.user.updateProfile({ nickname: nickname.value, bio: bio.value })
  saved.value = true
  setTimeout(() => {
    saved.value = false
  }, 2000)
}
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <PageHeader title="个人" subtitle="资料与收藏">
      <template #actions>
        <WwButton label="保存" icon="check" size="small" @click="save" />
      </template>
    </PageHeader>

    <div class="ww-scroll-main mx-auto w-full max-w-lg space-y-8">
      <section class="rounded-lg bg-ww-content p-4 space-y-3">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-ww-ink-faint">资料</h2>
        <div class="space-y-1.5">
          <label for="nickname" class="text-xs text-ww-ink-muted">昵称</label>
          <InputText id="nickname" v-model="nickname" class="w-full" />
        </div>
        <div class="space-y-1.5">
          <label for="bio" class="text-xs text-ww-ink-muted">简介</label>
          <Textarea id="bio" v-model="bio" class="w-full" rows="3" auto-resize />
        </div>
        <p v-if="saved" class="text-xs text-ww-accent">已保存</p>
      </section>

      <section class="rounded-lg bg-ww-content p-4 space-y-2">
        <h2 class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ww-ink-faint">
          收藏
          <Badge :value="favorites.length" severity="secondary" />
        </h2>
        <p class="text-xs text-ww-ink-muted">
          {{ favorites.length ? `${favorites.length} 项` : '详情页可收藏' }}
        </p>
      </section>
    </div>
  </div>
</template>
