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
import PersonalFavoriteRow from '@features/personal/PersonalFavoriteRow.vue'
import type { FavoriteEntry } from '@shared/types/favorite'

const router = useRouter()

const nickname = ref('')
const bio = ref('')
const favorites = ref<FavoriteEntry[]>([])
const loading = ref(true)
const saving = ref(false)
const saved = ref(false)

const profileInitial = computed(() => {
  const n = nickname.value.trim()
  if (!n) return '我'
  return n.slice(0, 1).toUpperCase()
})

const favoriteCount = computed(() => favorites.value.length)

async function load() {
  loading.value = true
  try {
    const [profile, list] = await Promise.all([
      window.wanwu.user.getProfile(),
      window.wanwu.user.listFavorites()
    ])
    if (profile) {
      nickname.value = profile.nickname
      bio.value = profile.bio
    }
    favorites.value = list
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

function openFavorite(entry: FavoriteEntry) {
  if (!entry.item) return
  router.push({ name: 'item-detail', params: { source: entry.source, id: entry.item.id } })
}

async function removeFavorite(entry: FavoriteEntry) {
  await window.wanwu.user.toggleFavorite({ itemId: entry.itemId, source: entry.source })
  favorites.value = favorites.value.filter((f) => f.id !== entry.id)
}
</script>

<template>
  <div class="ww-personal flex h-full flex-col overflow-hidden">
    <PageHeader title="个人" subtitle="资料与收藏">
      <template #actions>
        <Transition name="ww-personal-save-hint">
          <span v-if="saved" class="ww-personal__saved-hint" role="status">
            <WwIcon name="check" size="sm" />
            已保存
          </span>
        </Transition>
        <WwButton
          label="保存资料"
          icon="check"
          size="small"
          :loading="saving"
          @click="save"
        />
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
              </div>
            </div>
          </template>
        </section>

        <section class="ww-personal-favorites" aria-labelledby="personal-favorites-heading">
          <header class="ww-personal-favorites__head">
            <div>
              <h2 id="personal-favorites-heading" class="ww-section-label">收藏</h2>
              <p class="ww-personal-favorites__hint">在全库条目详情页点击「加入收藏」</p>
            </div>
            <span v-if="!loading && favoriteCount > 0" class="ww-personal-favorites__count">
              {{ favoriteCount }}
            </span>
          </header>

          <div v-if="loading" class="ww-personal-favorites__skeleton">
            <Skeleton v-for="i in 4" :key="i" height="4.25rem" class="mb-2 rounded-lg" />
          </div>

          <EmptyState
            v-else-if="favoriteCount === 0"
            variant="empty"
            title="还没有收藏"
            description="浏览全库时打开任意条目，在详情页即可加入收藏。"
            compact
          />

          <TransitionGroup
            v-else
            name="ww-favorite-list"
            tag="ul"
            class="ww-personal-favorites__list ww-stagger-children"
          >
            <li
              v-for="(entry, index) in favorites"
              :key="entry.id"
              :style="{ '--ww-stagger': index }"
            >
              <PersonalFavoriteRow
                :entry="entry"
                @open="openFavorite(entry)"
                @remove="removeFavorite(entry)"
              />
            </li>
          </TransitionGroup>
        </section>
      </div>
    </div>
  </div>
</template>
