<template>
  <div :class="wrapperClasses">
    <label v-if="component.props?.label" class="form-label">
      {{ component.props.label }}
    </label>
    <input 
      :type="component.props?.type || 'text'"
      :class="inputClasses"
      :placeholder="component.props?.placeholder"
      :disabled="component.props?.disabled"
      :required="component.props?.required"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
    >
    <div v-if="component.props?.help" class="form-text">
      {{ component.props.help }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  component: { type: Object, required: true },
  editMode: { type: Boolean, default: false },
  modelValue: { type: [String, Number], default: '' }
})

defineEmits(['update:modelValue'])

const wrapperClasses = computed(() => {
  return ['mb-3', ...(props.component.classes || [])]
})

const inputClasses = computed(() => {
  const classes = ['form-control']
  
  if (props.component.props?.size === 'sm') classes.push('form-control-sm')
  if (props.component.props?.size === 'lg') classes.push('form-control-lg')
  
  return classes
})
</script>


