<script setup lang="ts">
defineOptions({ name: 'CaPageHeader' })

defineProps<{
  eyebrow?: string
  title: string
  lead?: string
  badge?: string
}>()
</script>

<template>
  <header class="ww-ca-page-header">
    <div class="ww-ca-page-header__main">
      <p v-if="eyebrow" class="ww-ca-page__eyebrow">{{ eyebrow }}</p>
      <div class="ww-ca-page-header__title-row">
        <h1 class="ww-ca-page-header__title">{{ title }}</h1>
        <span v-if="badge" class="ww-ca-page-header__badge">{{ badge }}</span>
      </div>
      <p v-if="lead" class="ww-ca-page__lead">{{ lead }}</p>
    </div>
    <div v-if="$slots.actions" class="ww-ca-page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>
