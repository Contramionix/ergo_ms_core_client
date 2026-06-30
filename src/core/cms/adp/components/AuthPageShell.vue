<script setup>
import { onMounted } from 'vue'

import SiteWordmark from '@/components/SiteWordmark.vue'
import { useSiteName } from '@/composables/useSiteName.js'

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

const { siteName, ensureSiteNameLoaded } = useSiteName()

onMounted(ensureSiteNameLoaded)
</script>

<template>
  <div class="auth-page">
    <div class="auth-page__inner" :class="{ 'auth-page__inner--wide': wide }">
      <header v-if="showBrand" class="auth-page__brand">
        <h1 class="auth-page__site-name">
          <SiteWordmark
            :name="siteName"
            :cog-size="34"
            class="site-wordmark--lg site-wordmark--centered site-wordmark--brand-cog"
          />
        </h1>
      </header>

      <div class="auth-page__card">
        <slot />
      </div>
    </div>
  </div>
</template>
