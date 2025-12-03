<template>
  <hr :class="component.classes" :style="component.styles">
</template>

<script setup>
defineProps({
  component: { type: Object, required: true },
  editMode: { type: Boolean, default: false }
})
</script>


