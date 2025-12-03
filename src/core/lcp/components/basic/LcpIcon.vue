<template>
  <component 
    v-if="iconComponent" 
    :is="iconComponent" 
    :size="size"
    :class="component.classes"
    :style="component.styles"
  />
  <span v-else class="text-muted">?</span>
</template>

<script setup>
import { computed } from 'vue'
import * as Icons from 'lucide-vue-next'

const props = defineProps({
  component: { type: Object, required: true },
  editMode: { type: Boolean, default: false }
})

const iconComponent = computed(() => {
  const name = props.component.props?.name || 'Box'
  return Icons[name] || null
})

const size = computed(() => props.component.props?.size || 24)
</script>


