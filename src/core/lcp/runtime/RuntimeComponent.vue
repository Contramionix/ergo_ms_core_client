<template>
  <component 
    :is="componentRenderer" 
    :component="component"
    :edit-mode="editMode"
  >
    <RuntimeComponent
      v-for="child in component.children"
      :key="child.uid"
      :component="child"
      :edit-mode="editMode"
    />
  </component>
</template>

<script setup>
import { computed } from 'vue'
import { componentRegistry } from './componentRegistry'

const props = defineProps({
  component: { type: Object, required: true },
  editMode: { type: Boolean, default: false }
})

const componentRenderer = computed(() => {
  return componentRegistry[props.component.type] || componentRegistry.Unknown
})
</script>


