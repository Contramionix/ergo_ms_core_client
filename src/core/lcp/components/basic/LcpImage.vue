<template>
  <img 
    :src="src" 
    :alt="component.props?.alt || ''" 
    :class="imageClasses"
    :style="imageStyles"
  >
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  component: { type: Object, required: true },
  editMode: { type: Boolean, default: false }
})

const src = computed(() => {
  return props.component.props?.src || 'https://via.placeholder.com/300x200'
})

const imageClasses = computed(() => {
  const classes = [...(props.component.classes || [])]
  
  if (props.component.props?.fluid) classes.push('img-fluid')
  if (props.component.props?.rounded) classes.push('rounded')
  if (props.component.props?.thumbnail) classes.push('img-thumbnail')
  
  return classes
})

const imageStyles = computed(() => {
  const styles = { ...props.component.styles }
  
  if (props.component.props?.width) {
    styles.width = typeof props.component.props.width === 'number' 
      ? `${props.component.props.width}px` 
      : props.component.props.width
  }
  
  if (props.component.props?.height) {
    styles.height = typeof props.component.props.height === 'number'
      ? `${props.component.props.height}px`
      : props.component.props.height
  }
  
  return styles
})
</script>


