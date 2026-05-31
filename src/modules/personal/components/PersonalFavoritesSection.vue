<script setup lang="ts">
import { inject } from 'vue'
import Skeleton from 'primevue/skeleton'
import WwIcon from '@shared/components/WwIcon.vue'
import EmptyState from '@app/components/EmptyState.vue'
import FavoriteCard from '@modules/personal/FavoriteCard.vue'
import { PERSONAL_PAGE_KEY } from '@modules/personal/composables/personalPageContext'

const page = inject(PERSONAL_PAGE_KEY)!
const { loading, groups, favoriteCount, openFavorite, removeFavorite } = page
</script>

<template>
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
</template>

<style>
@import '../styles/personal-favorites.css';
</style>
