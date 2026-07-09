<script setup>
import { routeProgressState } from '@/js/routeProgressState.js'
</script>

<template>
  <div
    class="route-progress"
    :class="{
      'route-progress--active': routeProgressState.active,
      [`route-progress--${routeProgressState.phase}`]: routeProgressState.active,
    }"
    aria-hidden="true"
  >
    <div class="route-progress__bar" />
  </div>
</template>
