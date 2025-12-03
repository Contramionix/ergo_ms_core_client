<template>
  <div :class="containerClasses" :style="component.styles">
    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  component: { type: Object, required: true },
  editMode: { type: Boolean, default: false }
})

const containerClasses = computed(() => {
  const classes = ['container', ...(props.component.classes || [])]
  
  if (props.component.props?.fluid) {
    classes[0] = 'container-fluid'
  }
  
  return classes
})
</script>


