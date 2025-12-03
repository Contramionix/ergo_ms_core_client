<template>
  <div :class="wrapperClasses">
    <label v-if="component.props?.label" class="form-label">
      {{ component.props.label }}
    </label>
    <select 
      :class="selectClasses"
      :disabled="component.props?.disabled"
      :required="component.props?.required"
      :value="modelValue"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option v-if="component.props?.placeholder" value="" disabled>
        {{ component.props.placeholder }}
      </option>
      <option 
        v-for="opt in options" 
        :key="opt.value" 
        :value="opt.value"
      >
        {{ opt.label }}
      </option>
    </select>
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

const selectClasses = computed(() => {
  const classes = ['form-select']
  
  if (props.component.props?.size === 'sm') classes.push('form-select-sm')
  if (props.component.props?.size === 'lg') classes.push('form-select-lg')
  
  return classes
})

const options = computed(() => {
  return props.component.props?.options || []
})
</script>


