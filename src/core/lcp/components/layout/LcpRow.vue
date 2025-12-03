<template>
  <div :class="rowClasses" :style="component.styles">
    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  component: { type: Object, required: true },
  editMode: { type: Boolean, default: false }
})

const rowClasses = computed(() => {
  const classes = ['row', ...(props.component.classes || [])]
  
  const p = props.component.props || {}
  
  if (p.gutter) classes.push(`g-${p.gutter}`)
  if (p.align) classes.push(`align-items-${p.align}`)
  if (p.justify) classes.push(`justify-content-${p.justify}`)
  
  return classes
})
</script>


