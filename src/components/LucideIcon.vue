<script setup>
import { shallowRef, watch } from 'vue'
import { getLucideIconAsync } from '@/js/lucideIconLoader.js'

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  size: {
    type: [Number, String],
    default: 20,
  },
  strokeWidth: {
    type: [Number, String],
    default: 2,
  },
  iconClass: {
    type: [String, Object, Array],
    default: '',
  },
})

const IconComponent = shallowRef(null)

watch(
  () => props.name,
  async (name) => {
    IconComponent.value = name ? await getLucideIconAsync(name) : null
  },
  { immediate: true },
)
</script>

<template>
  <component
    :is="IconComponent"
    v-if="IconComponent"
    :size="size"
    :stroke-width="strokeWidth"
    :class="iconClass"
  />
</template>
