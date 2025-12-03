<template>
  <component :is="tag" :class="headingClasses" :style="component.styles">
    {{ component.props?.text || 'Заголовок' }}
  </component>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  component: { type: Object, required: true },
  editMode: { type: Boolean, default: false }
})

const tag = computed(() => {
  const level = props.component.props?.level || 2
  return `h${Math.min(Math.max(level, 1), 6)}`
})

const headingClasses = computed(() => {
  return [...(props.component.classes || [])]
})
</script>


