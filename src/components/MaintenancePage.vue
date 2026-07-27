<script setup>
import SiteWordmark from '@/components/SiteWordmark.vue'
import SkipLink from '@/components/SkipLink.vue'

defineProps({
  detail: {
    type: String,
    default: 'Система временно недоступна. Мы проводим обновление и скоро вернёмся.',
  },
  overlay: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <SkipLink />
  <main
    id="main-content"
    class="maintenance-page"
    :class="{ 'maintenance-page--overlay': overlay }"
    tabindex="-1"
    role="alert"
    aria-live="polite"
  >
    <div class="maintenance-page__backdrop" aria-hidden="true">
      <span class="maintenance-page__orb maintenance-page__orb--1" />
      <span class="maintenance-page__orb maintenance-page__orb--2" />
      <span class="maintenance-page__orb maintenance-page__orb--3" />
    </div>

    <section class="maintenance-page__card">
      <SiteWordmark class="site-wordmark--hero site-wordmark--centered maintenance-page__wordmark" />

      <p class="maintenance-page__badge">Технические работы</p>
      <h1 class="maintenance-page__title">Скоро вернёмся</h1>
      <p class="maintenance-page__text">{{ detail }}</p>

      <div class="maintenance-page__progress" aria-hidden="true">
        <span class="maintenance-page__progress-bar" data-ergo-motion-safe="pulse" />
      </div>

      <p class="maintenance-page__hint">
        Страница обновится автоматически, когда система снова станет доступна.
      </p>
    </section>
  </main>
</template>

<style scoped lang="scss">
.maintenance-page {
  --maint-accent: var(--color-accent, var(--bs-primary, var(--ui-accent, #d0322d)));
  --maint-accent-soft: var(--ui-accent-soft, rgba(208, 50, 45, 0.12));
  --maint-accent-glow: color-mix(in srgb, var(--maint-accent) 22%, transparent);

  position: relative;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(1rem, 4vw, 2.5rem);
  overflow: hidden;
  background: var(--ui-bg, var(--color-background, #f5f6f8));
  color: var(--ui-text, var(--color-primary-text, #14151a));
}

.maintenance-page--overlay {
  position: fixed;
  inset: 0;
  z-index: 10001;
}

.maintenance-page__backdrop {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.maintenance-page__orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(64px);
  opacity: 0.55;
  animation: maintenance-float 14s ease-in-out infinite;
}

.maintenance-page__orb--1 {
  top: -8%;
  left: -6%;
  width: min(42vw, 320px);
  height: min(42vw, 320px);
  background: var(--maint-accent-glow);
}

.maintenance-page__orb--2 {
  right: -4%;
  bottom: -10%;
  width: min(48vw, 360px);
  height: min(48vw, 360px);
  background: var(--ui-info-soft, rgba(13, 110, 253, 0.18));
  animation-delay: -4s;
}

.maintenance-page__orb--3 {
  top: 38%;
  right: 18%;
  width: min(28vw, 200px);
  height: min(28vw, 200px);
  background: var(--ui-warning-soft, rgba(255, 193, 7, 0.16));
  animation-delay: -8s;
}

.maintenance-page__card {
  position: relative;
  z-index: 1;
  width: min(100%, 28rem);
  padding: clamp(1.5rem, 5vw, 2.25rem);
  text-align: center;
  background: color-mix(in srgb, var(--ui-surface, #fff) 92%, transparent);
  border: 1px solid var(--ui-border, rgba(17, 18, 35, 0.14));
  border-radius: var(--ui-radius-lg, 14px);
  box-shadow: var(--ui-shadow-lg, 0 8px 24px rgba(17, 18, 35, 0.08));
  backdrop-filter: blur(12px);
}

.maintenance-page__wordmark {
  display: flex;
  width: 100%;
  margin: 0 0 1.25rem;
}

.maintenance-page__wordmark :deep(.ergoms-logo__cog) {
  transform-origin: 240px 66px;
  animation: maintenance-cog 8s linear infinite;
}

.maintenance-page__badge {
  display: inline-block;
  margin: 0 0 0.75rem;
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--maint-accent);
  background: var(--maint-accent-soft);
  border-radius: var(--ui-pill, 999px);
}

.maintenance-page__title {
  margin: 0 0 0.75rem;
  font-size: clamp(1.5rem, 4.5vw, 1.875rem);
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.maintenance-page__text {
  margin: 0;
  font-size: clamp(0.95rem, 2.5vw, 1.05rem);
  line-height: 1.65;
  color: var(--ui-text-muted, var(--color-secondary-text, #5b616e));
}

.maintenance-page__progress {
  height: 4px;
  margin: 1.5rem 0 1rem;
  overflow: hidden;
  background: var(--ui-surface-2, #f1f3f5);
  border-radius: var(--ui-pill, 999px);
}

.maintenance-page__progress-bar {
  display: block;
  width: 40%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    var(--maint-accent),
    transparent
  );
  border-radius: inherit;
  animation: maintenance-progress 1.8s ease-in-out infinite;
}

.maintenance-page__hint {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--ui-text-muted, var(--color-secondary-text, #5b616e));
  opacity: 0.85;
}

@keyframes maintenance-float {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(2%, -3%) scale(1.04);
  }
}

@keyframes maintenance-cog {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes maintenance-progress {
  0% {
    transform: translateX(-120%);
  }
  100% {
    transform: translateX(320%);
  }
}

html[data-ergo-motion='reduce'] {
  .maintenance-page__orb,
  .maintenance-page__wordmark :deep(.ergoms-logo__cog) {
    animation: none !important;
  }

  .maintenance-page__progress-bar {
    width: 100%;
    transform: none !important;
    background: var(--maint-accent);
  }
}
</style>
