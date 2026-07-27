<script setup>
import SiteWordmark from '@/components/SiteWordmark.vue'

defineProps({
  wide: {
    type: Boolean,
    default: false,
  },
  showBrand: {
    type: Boolean,
    default: true,
  },
})
</script>

<template>
  <div class="auth-page">
    <div class="auth-page__inner" :class="{ 'auth-page__inner--wide': wide }">
      <header v-if="showBrand" class="auth-page__brand">
        <h1 class="auth-page__site-name">
          <span class="visually-hidden">ERGO MS</span>
          <SiteWordmark class="auth-page__wordmark site-wordmark--centered" aria-hidden="true" />
        </h1>
      </header>

      <div class="auth-page__card">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.auth-page__wordmark {
  font-size: clamp(4.5rem, 10vw, 6rem);
  font-weight: 700;
  letter-spacing: 0.04em;
}
</style>