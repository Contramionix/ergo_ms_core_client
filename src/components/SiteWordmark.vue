<script setup>
import { computed } from 'vue'
import { Cog } from 'lucide-vue-next'

import { splitSiteName } from '@/js/siteWordmark.js'

const props = defineProps({
  name: {
    type: String,
    default: 'ERGOMS',
  },
  cogSize: {
    type: Number,
    default: 32,
  },
  compact: {
    type: Boolean,
    default: false,
  },
})

const parts = computed(() => splitSiteName(props.name))
</script>

<template>
  <span class="site-wordmark" :class="{ 'site-wordmark--compact': compact }">
    <span v-if="!compact && parts.prefix" class="site-wordmark__text">{{ parts.prefix }}</span>
    <Cog
      v-if="parts.hasCog"
      class="site-wordmark__cog"
      :size="cogSize"
      aria-hidden="true"
    />
    <span v-if="!compact && parts.suffix" class="site-wordmark__text">{{ parts.suffix }}</span>
  </span>
</template>
