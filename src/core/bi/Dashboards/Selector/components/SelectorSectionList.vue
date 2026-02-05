<template>
  <div class="settings-table">
    <SelectorDataSection
      :selector="selector"
      :source-input-value="sourceInputValue"
      :source-input-placeholder="sourceInputPlaceholder"
      :is-dropdown-open="isDropdownOpen"
      :is-field-dropdown-open="isFieldDropdownOpen"
      :available-fields="availableFields"
      :selected-field-type="selectedFieldType"
      :selected-field-name="selectedFieldName"
      :is-url-validating="isUrlValidating"
      :url-validation-result="urlValidationResult"
      @update:sourceInputValue="$emit('update:sourceInputValue', $event)"
      @toggle-dropdown="$emit('toggle-dropdown')"
      @select-source-type="$emit('select-source-type', $event)"
      @toggle-field-dropdown="$emit('toggle-field-dropdown')"
      @select-field="$emit('select-field', $event)"
      @source-input-click="$emit('source-input-click')"
    />
    
    <SelectorFilterSection
      :selector="selector"
      :is-selector-type-dropdown-open="isSelectorTypeDropdownOpen"
      :is-operation-dropdown-open="isOperationDropdownOpen"
      :selector-types-with-availability="selectorTypesWithAvailability"
      :selector-type-label="selectorTypeLabel"
      :available-operations="availableOperations"
      :current-operation-label="currentOperationLabel"
      :should-show-default-value-selector="shouldShowDefaultValueSelector"
      @update:selector="$emit('update:selector', $event)"
      @toggle-selector-type-dropdown="$emit('toggle-selector-type-dropdown')"
      @select-selector-type="$emit('select-selector-type', $event)"
      @toggle-operation-dropdown="$emit('toggle-operation-dropdown')"
      @select-operation="$emit('select-operation', $event)"
    />
    
    <SelectorDisplaySection
      :selector="selector"
      @update:selector="$emit('update:selector', $event)"
    />
  </div>
</template>

<script setup>
import SelectorDataSection from './SelectorDataSection.vue'
import SelectorFilterSection from './SelectorFilterSection.vue'
import SelectorDisplaySection from './SelectorDisplaySection.vue'

defineProps({
  selector: {
    type: Object,
    required: true
  },
  sourceInputValue: {
    type: String,
    default: ''
  },
  sourceInputPlaceholder: {
    type: String,
    default: ''
  },
  isDropdownOpen: {
    type: Boolean,
    default: false
  },
  isFieldDropdownOpen: {
    type: Boolean,
    default: false
  },
  isSelectorTypeDropdownOpen: {
    type: Boolean,
    default: false
  },
  isOperationDropdownOpen: {
    type: Boolean,
    default: false
  },
  availableFields: {
    type: Array,
    default: () => []
  },
  selectedFieldType: {
    type: String,
    default: null
  },
  selectedFieldName: {
    type: String,
    default: null
  },
  isUrlValidating: {
    type: Boolean,
    default: false
  },
  urlValidationResult: {
    type: Object,
    default: null
  },
  selectorTypesWithAvailability: {
    type: Array,
    default: () => []
  },
  selectorTypeLabel: {
    type: String,
    default: 'Выберите тип'
  },
  availableOperations: {
    type: Array,
    default: () => []
  },
  currentOperationLabel: {
    type: String,
    default: '—'
  },
  shouldShowDefaultValueSelector: {
    type: Boolean,
    default: false
  }
})

defineEmits([
  'update:selector',
  'update:sourceInputValue',
  'toggle-dropdown',
  'select-source-type',
  'toggle-field-dropdown',
  'select-field',
  'source-input-click',
  'toggle-selector-type-dropdown',
  'select-selector-type',
  'toggle-operation-dropdown',
  'select-operation'
])
</script>

<style scoped lang="scss">
.settings-table {
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow: visible;
}
</style>
