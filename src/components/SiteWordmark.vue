<script setup>
import ErgomsLogo from '@/composables/ErgomsLogo.vue'

defineProps({
  compact: {
    type: Boolean,
    default: false,
  },
  compactIconSize: {
    type: Number,
    default: 20,
  },
})
</script>

<template>
  <span class="site-wordmark" :class="{ 'site-wordmark--compact': compact }">
    <ErgomsLogo :compact="compact" :compact-icon-size="compactIconSize" class="site-wordmark__logo"/>
  </span>
</template>