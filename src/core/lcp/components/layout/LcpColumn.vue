<template>
  <div :class="colClasses" :style="component.styles">
    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  component: { type: Object, required: true },
  editMode: { type: Boolean, default: false }
})

const colClasses = computed(() => {
  const classes = [...(props.component.classes || [])]
  const p = props.component.props || {}
  
  // Базовый размер
  if (p.col) {
    classes.push(`col-${p.col}`)
  } else {
    classes.push('col')
  }
  
  // Адаптивные размеры
  if (p.sm) classes.push(`col-sm-${p.sm}`)
  if (p.md) classes.push(`col-md-${p.md}`)
  if (p.lg) classes.push(`col-lg-${p.lg}`)
  if (p.xl) classes.push(`col-xl-${p.xl}`)
  
  return classes
})
</script>


