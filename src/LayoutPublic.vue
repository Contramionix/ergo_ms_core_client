<script setup>
import LayoutBackdrop from '@/components/LayoutBackdrop.vue'
import RouteViewAnimated from '@/components/RouteViewAnimated.vue'
</script>

<template>
  <div class="layout-public">
    <LayoutBackdrop />
    <div class="layout-public__content">
      <RouteViewAnimated :use-keep-alive="false" />
    </div>
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
}
</style>
