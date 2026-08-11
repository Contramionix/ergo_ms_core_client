<script setup>
import { computed } from 'vue'
import SiteWordmark from '@/components/SiteWordmark.vue'
import SkipLink from '@/components/SkipLink.vue'
import { useAppI18n } from '@/i18n/useAppI18n.js'

const { t } = useAppI18n()

const props = defineProps({
  overlay: {
    type: Boolean,
    default: false,
  },
  retryAfter: {
    type: Number,
    default: 0,
  },
  retrying: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['retry'])

const retryDisabled = computed(() => props.retrying || props.retryAfter > 0)

const hintText = computed(() => {
  if (props.retrying) {
    return t('components.tooManyRequests.retrying')
  }
  if (props.retryAfter > 0) {
    return t('components.tooManyRequests.retryIn', { seconds: props.retryAfter })
  }
  return t('components.tooManyRequests.hint')
})

const retryLabel = computed(() => {
  if (props.retrying) {
    return t('components.tooManyRequests.retrying')
  }
  if (props.retryAfter > 0) {
    return t('components.tooManyRequests.retryIn', { seconds: props.retryAfter })
  }
  return t('components.tooManyRequests.retry')
})
</script>

<template>
  <SkipLink />
  <main
    id="main-content"
    class="too-many-requests"
    :class="{ 'too-many-requests--overlay': overlay }"
    tabindex="-1"
    role="alert"
    aria-live="polite"
  >
    <div class="too-many-requests__backdrop" aria-hidden="true">
      <span class="too-many-requests__orb too-many-requests__orb--1" />
      <span class="too-many-requests__orb too-many-requests__orb--2" />
      <span class="too-many-requests__orb too-many-requests__orb--3" />
    </div>

    <section class="too-many-requests__card">
      <SiteWordmark class="site-wordmark--hero site-wordmark--centered too-many-requests__wordmark" />

      <p class="too-many-requests__badge">{{ t('components.tooManyRequests.badge') }}</p>
      <h1 class="too-many-requests__title">{{ t('components.tooManyRequests.title') }}</h1>
      <p class="too-many-requests__text">{{ t('components.tooManyRequests.detail') }}</p>
      <p class="too-many-requests__hint">{{ hintText }}</p>

      <button
        class="ui-btn ui-btn--primary too-many-requests__retry"
        type="button"
        :disabled="retryDisabled"
        :aria-busy="retrying ? 'true' : 'false'"
        @click="emit('retry')"
      >
        {{ retryLabel }}
      </button>
    </section>
  </main>
</template>

<style scoped lang="scss">
.too-many-requests {
  --tmr-accent: var(--color-accent, var(--bs-primary, var(--ui-accent, #d0322d)));
  --tmr-accent-soft: var(--ui-accent-soft, rgba(208, 50, 45, 0.12));
  --tmr-accent-glow: color-mix(in srgb, var(--tmr-accent) 22%, transparent);

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

.too-many-requests--overlay {
  position: fixed;
  inset: 0;
  z-index: 10001;
}

.too-many-requests__backdrop {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.too-many-requests__orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(64px);
  opacity: 0.55;
  animation: too-many-requests-float 14s ease-in-out infinite;
}

.too-many-requests__orb--1 {
  top: -8%;
  left: -6%;
  width: min(42vw, 320px);
  height: min(42vw, 320px);
  background: var(--tmr-accent-glow);
}

.too-many-requests__orb--2 {
  right: -4%;
  bottom: -10%;
  width: min(48vw, 360px);
  height: min(48vw, 360px);
  background: var(--ui-info-soft, rgba(13, 110, 253, 0.18));
  animation-delay: -4s;
}

.too-many-requests__orb--3 {
  top: 38%;
  right: 18%;
  width: min(28vw, 200px);
  height: min(28vw, 200px);
  background: var(--ui-warning-soft, rgba(255, 193, 7, 0.16));
  animation-delay: -8s;
}

.too-many-requests__card {
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

.too-many-requests__wordmark {
  display: flex;
  width: 100%;
  margin: 0 0 1.25rem;
}

.too-many-requests__badge {
  display: inline-block;
  margin: 0 0 0.75rem;
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--tmr-accent);
  background: var(--tmr-accent-soft);
  border-radius: var(--ui-pill, 999px);
}

.too-many-requests__title {
  margin: 0 0 0.75rem;
  font-size: clamp(1.5rem, 4.5vw, 1.875rem);
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.too-many-requests__text {
  margin: 0 0 0.75rem;
  font-size: clamp(0.95rem, 2.5vw, 1.05rem);
  line-height: 1.65;
  color: var(--ui-text-muted, var(--color-secondary-text, #5b616e));
}

.too-many-requests__hint {
  margin: 0 0 1.5rem;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--ui-text-muted, var(--color-secondary-text, #5b616e));
  opacity: 0.85;
}

.too-many-requests__retry {
  min-width: 10rem;
}

@keyframes too-many-requests-float {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(2%, -3%) scale(1.04);
  }
}

html[data-ergo-motion='reduce'] {
  .too-many-requests__orb {
    animation: none !important;
  }
}
</style>
