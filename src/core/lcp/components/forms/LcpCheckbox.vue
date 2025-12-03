<template>
  <div class="form-check" :class="component.classes">
    <input 
      type="checkbox"
      class="form-check-input"
      :id="checkId"
      :checked="modelValue"
      :disabled="component.props?.disabled"
      @change="$emit('update:modelValue', $event.target.checked)"
    >
    <label class="form-check-label" :for="checkId">
      {{ component.props?.label || 'Checkbox' }}
    </label>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  component: { type: Object, required: true },
  editMode: { type: Boolean, default: false },
  modelValue: { type: Boolean, default: false }
})

defineEmits(['update:modelValue'])

const checkId = computed(() => `check-${props.component.uid}`)
</script>


