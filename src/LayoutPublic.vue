<script setup>
import LayoutBackdrop from '@/components/LayoutBackdrop.vue'
import RouteViewAnimated from '@/components/RouteViewAnimated.vue'
import SkipLink from '@/components/SkipLink.vue'
</script>

<template>
  <div class="layout-public">
    <SkipLink />
    <LayoutBackdrop data-ergo-decorative-image />
    <main id="main-content" class="layout-public__content" tabindex="-1">
      <RouteViewAnimated :use-keep-alive="false" />
    </main>
  </div>
</template>

<style lang="scss" scoped>
.layout-public {
  position: relative;
  min-height: 100dvh;
  background: var(--color-background);
  overflow-x: clip;
}

.layout-public__content {
  position: relative;
  z-index: 1;
  min-height: inherit;
  overflow: clip;
  outline: none;
}
</style>
