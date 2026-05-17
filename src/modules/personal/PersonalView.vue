<script setup lang="ts">
import { onMounted, ref } from 'vue'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'

const nickname = ref('')
const bio = ref('')
const favorites = ref<unknown[]>([])

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
}
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <header class="border-b border-ww-border px-6 py-4">
      <h1 class="text-lg font-medium">个人</h1>
      <p class="text-xs text-ww-muted">资料、收藏与主页</p>
    </header>

    <div class="flex-1 overflow-y-auto p-6">
      <section class="max-w-lg">
        <h2 class="mb-4 text-sm font-medium">基本资料</h2>
        <label class="mb-1 block text-xs text-ww-muted">昵称</label>
        <InputText v-model="nickname" class="mb-4 w-full" />
        <label class="mb-1 block text-xs text-ww-muted">简介</label>
        <Textarea v-model="bio" class="mb-4 w-full" rows="4" />
        <Button label="保存" size="small" @click="save" />
      </section>

      <section class="mt-10 max-w-lg">
        <h2 class="mb-2 text-sm font-medium">收藏</h2>
        <p class="text-xs text-ww-muted">{{ favorites.length }} 项收藏</p>
      </section>
    </div>
  </div>
</template>
