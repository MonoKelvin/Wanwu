<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Skeleton from 'primevue/skeleton'
import WwButton from '@shared/components/WwButton.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import PageHeader from '@app/components/PageHeader.vue'
import EmptyState from '@app/components/EmptyState.vue'
import FavoriteCard from '@features/personal/FavoriteCard.vue'
import type { FavoriteGroup } from '@shared/types/favorite'

const router = useRouter()

const nickname = ref('')
const bio = ref('')
const groups = ref<FavoriteGroup[]>([])
const loading = ref(true)
const saving = ref(false)
const saved = ref(false)

const profileInitial = computed(() => {
  const n = nickname.value.trim()
  if (!n) return '?'
  return n.slice(0, 1).toUpperCase()
})

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
    }
    groups.value = list
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function save() {
  saving.value = true
  try {
    await window.wanwu.user.updateProfile({ nickname: nickname.value, bio: bio.value })
    saved.value = true
    setTimeout(() => {
      saved.value = false
    }, 2400)
  } finally {
    saving.value = false
  }
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
  <div class="ww-personal flex h-full flex-col overflow-hidden">
    <PageHeader title="个人" subtitle="资料与收�?>
      <template #actions>
        <Transition name="ww-personal-save-hint">
          <span v-if="saved" class="ww-personal__saved-hint" role="status">
            <WwIcon name="check" size="sm" />
            已保�?
          </span>
        </Transition>
        <WwButton label="保存资料" icon="check" size="small" :loading="saving" @click="save" />
      </template>
    </PageHeader>

    <div class="ww-scroll-main ww-personal__scroll">
      <div class="ww-personal__inner">
        <section class="ww-personal-hero" aria-labelledby="personal-profile-heading">
          <div class="ww-personal-hero__glow ww-personal-hero__glow--a" aria-hidden="true" />
          <div class="ww-personal-hero__glow ww-personal-hero__glow--b" aria-hidden="true" />

          <div v-if="loading" class="ww-personal-hero__skeleton">
            <Skeleton shape="circle" size="4.5rem" />
            <Skeleton width="60%" height="1.75rem" class="mt-4" />
            <Skeleton width="100%" height="4rem" class="mt-3" />
          </div>

          <template v-else>
            <div class="ww-personal-hero__profile">
              <div class="ww-personal-hero__avatar" aria-hidden="true">
                <span>{{ profileInitial }}</span>
              </div>
              <div class="ww-personal-hero__fields">
                <h2 id="personal-profile-heading" class="ww-section-label">个人资料</h2>
                <div class="ww-personal-field">
                  <label for="nickname" class="ww-personal-field__label">昵称</label>
                  <InputText
                    id="nickname"
                    v-model="nickname"
                    placeholder="万物探索�?
                    class="ww-personal-field__input w-full"
                  />
                </div>
                <div class="ww-personal-field">
                  <label for="bio" class="ww-personal-field__label">简�?/label>
                  <Textarea
                    id="bio"
                    v-model="bio"
                    class="ww-personal-field__input w-full"
                    rows="3"
                    auto-resize
                    placeholder="写一句关于自己的介绍�?
                  />
                </div>
              </div>
            </div>
          </template>
        </section>

        <section class="ww-personal-favorites" aria-labelledby="personal-favorites-heading">
          <header class="ww-personal-favorites__head">
            <div>
              <h2 id="personal-favorites-heading" class="ww-section-label">收藏</h2>
              <p class="ww-personal-favorites__hint">按分组浏览，卡片仅显示封面与名称</p>
            </div>
            <span v-if="!loading && favoriteCount > 0" class="ww-personal-favorites__count">
              {{ favoriteCount }}
            </span>
          </header>

          <div v-if="loading" class="ww-personal-favorites__skeleton-grid">
            <Skeleton v-for="i in 6" :key="i" height="10rem" class="rounded-xl" />
          </div>

          <EmptyState
            v-else-if="favoriteCount === 0"
            variant="empty"
            title="还没有收�?
            description="在物品详情页点击心形图标，选择分组即可收藏�?
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
                <span class="ww-fav-group__count">{{ group.items.length }}</span>
              </header>
              <ul class="ww-fav-group__grid">
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
  </div>
</template>
