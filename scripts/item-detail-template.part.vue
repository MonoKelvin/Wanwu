<template>
  <div class="ww-product-detail">
    <header class="ww-product-detail__bar ww-chrome-safe ww-glass-surface--bar">
      <button
        type="button"
        class="ww-product-detail__back ww-glass-btn ww-glass-btn--icon ww-glass-btn--on-light"
        aria-label="返回"
        @click="goBack"
      >
        <WwIcon name="arrow-left" size="sm" />
      </button>
      <nav class="ww-product-detail__crumb" aria-label="breadcrumb">
        <span v-if="item?.subCategoryName" class="ww-product-detail__crumb-muted">{{ item.subCategoryName }}</span>
        <span v-if="item?.subCategoryName" class="ww-product-detail__crumb-sep" aria-hidden="true">/</span>
        <span class="ww-product-detail__crumb-current">{{ item?.name ?? U.loading }}</span>
      </nav>
      <div v-if="item" class="ww-product-detail__page-meta" aria-label="时间信息">
        <span v-if="item.createdAt" class="ww-product-detail__page-meta-item">
          创建时间: {{ formatDateTime(item.createdAt) }}
        </span>
        <span v-if="item.updatedAt" class="ww-product-detail__page-meta-item">
          更新时间: {{ formatDateTime(item.updatedAt) }}
        </span>
      </div>
    </header>

    <Transition name="ww-toast">
      <p v-if="toast" class="ww-product-detail__toast" role="status">{{ toast }}</p>
    </Transition>

    <div v-if="loading" class="ww-product-detail__scroll">
      <div class="ww-product-detail__inner ww-product-detail__skeleton">
        <Skeleton width="100%" height="18rem" class="!rounded-xl !bg-ww-panel" />
        <Skeleton width="48%" height="1.75rem" class="!mt-6 !bg-ww-panel" />
        <Skeleton width="88%" height="3.5rem" class="!mt-3 !bg-ww-panel" />
      </div>
    </div>

    <EmptyState
      v-else-if="!item"
      variant="not-found"
      code="404"
      title="未找到物品"
      description="该条目可能已被删除或 ID 不正确。"
    />

    <div v-else class="ww-product-detail__scroll">
      <article ref="shareCaptureRef" class="ww-product-detail__inner" data-share-capture>
        <div class="ww-product-detail__main">
          <section class="ww-product-detail__gallery" aria-label="图片">
            <button
              type="button"
              class="ww-product-detail__id-outside ww-product-detail__id-link"
              :title="'点击复制 ID：' + item.id"
              @click="copyItemId"
            >
              ID: {{ item.id }}
            </button>
            <div
              class="ww-product-detail__hero-stage ww-surface-grid"
              @mouseenter="heroHover = true"
              @mouseleave="heroHover = false"
            >
              <div
                class="ww-product-detail__hero-frame"
                :class="{ 'ww-product-detail__hero-frame--openable': activeImage }"
                @click="onHeroOpenClick"
              >
                <img
                  v-if="activeImage"
                  :src="activeImage"
                  :alt="item.name"
                  class="ww-product-detail__hero-img"
                />
                <WwIcon v-else name="image" size="lg" class="ww-product-detail__hero-placeholder" />
              </div>

              <ItemDetailHeroActions
                v-if="isLibrary || activeImage"
                v-model:menu-open="heroMenuOpen"
                :visible="heroActionsVisible"
                :has-active-image="Boolean(activeImage)"
                :has-source-link="Boolean(sourceUrl)"
                @open-lightbox="openLightbox"
                @download="downloadActiveImage"
                @reveal-in-folder="revealInFolder"
                @open-source="openSourceLink"
                @upload-image="uploadImage"
              />
            </div>

            <UnsplashAttribution
              v-if="activeAttribution"
              class="ww-product-detail__credit"
              :attribution="activeAttribution"
            />

            <div
              v-if="gallerySlides.length > 1 || isLibrary"
              class="ww-product-detail__thumbs"
              role="tablist"
              aria-label="图集"
            >
              <button
                v-for="(slide, i) in gallerySlides"
                :key="slide.url"
                type="button"
                role="tab"
                class="ww-product-detail__thumb"
                :class="{ 'ww-product-detail__thumb--active': activeImage === slide.url }"
                :aria-selected="activeImage === slide.url"
                :aria-label="`图 ${i + 1}`"
                @click="selectImage(slide.url)"
              >
                <img :src="slide.url" alt="" />
              </button>
              <button
                v-if="isLibrary"
                type="button"
                class="ww-product-detail__thumb ww-product-detail__thumb--add"
                :disabled="uploading"
                aria-label="上传图片"
                @click="uploadImage"
              >
                <WwIcon name="plus" size="sm" />
              </button>
            </div>
          </section>

          <section class="ww-product-detail__info">
            <header class="ww-product-detail__intro">
              <h1 class="ww-product-detail__title">{{ item.name }}</h1>
              <p v-if="item.summary" class="ww-product-detail__lead">{{ item.summary }}</p>
            </header>

            <div v-if="item.tags?.length" class="ww-product-detail__tags">
              <span v-for="tag in item.tags" :key="tag" class="ww-product-detail__pill-tag">
                {{ tag }}
              </span>
            </div>

            <div v-if="specEntries.length" class="ww-product-detail__spec-block">
              <h2 class="ww-section-label">规格参数</h2>
              <dl class="ww-product-detail__specs">
                <div v-for="[key, val] in specEntries" :key="key" class="ww-product-detail__spec-row">
                  <dt>{{ key }}</dt>
                  <dd>{{ val }}</dd>
                </div>
              </dl>
            </div>
          </section>
        </div>

        <section v-if="isLibrary" class="ww-product-detail__desc">
          <div class="ww-product-detail__desc-head">
            <h2 class="ww-section-label">详细介绍</h2>
            <div v-if="!descEditing" class="ww-product-detail__desc-actions">
              <button
                type="button"
                class="ww-product-detail__desc-btn"
                aria-label="编辑详情"
                @click="startDescEdit"
              >
                <WwIcon name="pencil" size="sm" />
              </button>
            </div>
            <div v-else class="ww-product-detail__desc-actions">
              <button
                type="button"
                class="ww-product-detail__desc-btn ww-product-detail__desc-btn--primary"
                :disabled="descSaving"
                aria-label="完成"
                @click="saveDescEdit"
              >
                <WwIcon name="check" size="sm" />
              </button>
              <button
                type="button"
                class="ww-product-detail__desc-btn"
                :disabled="descSaving"
                aria-label="取消"
                @click="cancelDescEdit"
              >
                <WwIcon name="x" size="sm" />
              </button>
            </div>
          </div>

          <div v-if="descEditing" class="ww-product-detail__desc-editor">
            <Textarea
              v-model="descDraft"
              class="w-full"
              rows="12"
              auto-resize
              placeholder="Markdown 正文"
            />
          </div>
          <ItemMarkdown
            v-else-if="item.description"
            :content="item.description"
            class="ww-product-detail__prose"
          />
          <p v-else class="ww-product-detail__desc-empty">暂无详细介绍，点击上方编辑按钮添加。</p>
        </section>

        <section v-else-if="item.description" class="ww-product-detail__desc">
          <h2 class="ww-section-label">详细介绍</h2>
          <ItemMarkdown :content="item.description" class="ww-product-detail__prose" />
        </section>
      </article>
    </div>

    <div
      v-if="item && !loading"
      class="ww-product-detail__float-dock ww-product-detail__dock ww-glass-blur"
      role="toolbar"
      aria-label="物品操作"
    >
      <button
        v-tooltip.bottom="isLiked ? '取消点赞' : '点赞'"
        type="button"
        class="ww-product-detail__dock-btn"
        :class="{ 'ww-product-detail__dock-btn--liked': isLiked }"
        :aria-pressed="isLiked"
        :aria-label="isLiked ? '取消点赞' : '点赞'"
        @click="onLikeClick"
      >
        <WwIcon name="thumbs-up" size="sm" :filled="isLiked" />
      </button>
      <button
        v-tooltip.bottom="isFavorited ? '取消收藏' : '收藏'"
        type="button"
        class="ww-product-detail__dock-btn"
        :class="{ 'ww-product-detail__dock-btn--active': isFavorited }"
        :aria-pressed="isFavorited"
        :aria-label="isFavorited ? '取消收藏' : '收藏'"
        @click="onFavoriteClick"
      >
        <WwIcon name="heart" size="sm" :filled="isFavorited" />
      </button>
      <button
        v-tooltip.bottom="'分享长图'"
        type="button"
        class="ww-product-detail__dock-btn"
        aria-label="分享长图"
        @click="openShareImageDialog"
      >
        <WwIcon name="share" size="sm" />
      </button>
      <button
        v-tooltip.bottom="'定制卡片'"
        type="button"
        class="ww-product-detail__dock-btn"
        aria-label="定制卡片"
        @click="shareCardOpen = true"
      >
        <WwIcon name="sparkles" size="sm" />
      </button>
      <button
        v-tooltip.bottom="'复制详情'"
        type="button"
        class="ww-product-detail__dock-btn"
        aria-label="复制详情"
        @click="copyItemDetails"
      >
        <WwIcon name="copy" size="sm" />
      </button>
    </div>

    <ImageViewer v-model:open="lightboxOpen" v-model:index="lightboxIndex" :slides="lightboxSlides" />

    <ItemShareImageDialog
      v-model:visible="shareImageOpen"
      :item="item"
      :capture-el="shareCaptureRef"
      @toast="showToast"
    />

    <FavoriteGroupPickerDialog
      v-model:visible="groupPickerOpen"
      :item-name="item?.name"
      @confirm="onFavoriteGroupPicked"
    />

    <ItemShareCardDialog v-model:visible="shareCardOpen" :item="item" :cover-url="activeImage" />
  </div>
</template>