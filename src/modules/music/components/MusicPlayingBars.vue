<template>
  <span class="ww-music-playing-bars" aria-hidden="true">
    <span class="ww-music-playing-bars__bar" />
    <span class="ww-music-playing-bars__bar" />
    <span class="ww-music-playing-bars__bar" />
  </span>
</template>

<style scoped>
.ww-music-playing-bars {
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  gap: 0.14rem;
  width: 1rem;
  height: 0.875rem;
}

.ww-music-playing-bars__bar {
  width: 0.16rem;
  height: 100%;
  border-radius: 999px;
  background: var(--ww-accent);
  transform-origin: center bottom;
  animation: ww-music-playing-bar 0.85s ease-in-out infinite;
}

.ww-music-playing-bars__bar:nth-child(1) {
  animation-delay: 0s;
}

.ww-music-playing-bars__bar:nth-child(2) {
  animation-delay: 0.15s;
}

.ww-music-playing-bars__bar:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes ww-music-playing-bar {
  0%,
  100% {
    transform: scaleY(0.32);
    opacity: 0.55;
  }
  50% {
    transform: scaleY(1);
    opacity: 1;
  }
}
</style>
