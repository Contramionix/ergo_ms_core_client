<template>
  <p :class="textClasses" :style="component.styles">
    {{ component.props?.text || 'Текст' }}
  </p>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  component: { type: Object, required: true },
  editMode: { type: Boolean, default: false }
})

const textClasses = computed(() => {
  return [...(props.component.classes || [])]
})
</script>


