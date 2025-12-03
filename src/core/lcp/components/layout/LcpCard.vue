<template>
  <div :class="cardClasses" :style="component.styles">
    <div v-if="hasHeader" class="card-header">
      {{ component.props?.title }}
    </div>
    <div class="card-body">
      <slot />
    </div>
    <div v-if="hasFooter" class="card-footer">
      {{ component.props?.footer }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  component: { type: Object, required: true },
  editMode: { type: Boolean, default: false }
})

const cardClasses = computed(() => {
  return ['card', ...(props.component.classes || [])]
})

const hasHeader = computed(() => !!props.component.props?.title)
const hasFooter = computed(() => !!props.component.props?.footer)
</script>


