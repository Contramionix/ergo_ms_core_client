<template>
  <div
    class="layout-backdrop"
    :class="{ 'layout-backdrop--menu-offset': menuOffset }"
    aria-hidden="true"
  >
    <span class="layout-backdrop__orb layout-backdrop__orb--primary" />
    <span class="layout-backdrop__orb layout-backdrop__orb--secondary" />
    <span class="layout-backdrop__orb layout-backdrop__orb--accent" />
  </div>
</template>

<script setup>
defineProps({
  menuOffset: {
    type: Boolean,
    default: false,
  },
})
</script>
