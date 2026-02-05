<template>
  <div class="settings-section">
    <h6 class="section-title">Данные</h6>
    
    <div class="settings-row">
      <div class="settings-label">Источник</div>
      <div class="settings-control">
        <div class="source-selector">
          <div class="input-group">
            <div class="input-wrapper">
              <div v-if="selector.sourceType === 'dataset' && selector.selectedDataset" class="input-icon-wrapper">
                <Database class="input-icon" />
              </div>
              <div v-if="selector.sourceType === 'url' && selector.datasetUrl" class="input-icon-wrapper">
                <Link class="input-icon" />
              </div>
              <input 
                :value="sourceInputValue"
                type="text" 
                class="form-control-button"
                style="border-top-right-radius: 0px !important;  border-bottom-right-radius: 0px !important;"
                :placeholder="sourceInputPlaceholder"
                @click="handleSourceInputClick"
                @input="handleSourceInputChange"
                :readonly="selector.sourceType === 'dataset'"
                :class="['form-control', { 
                  'source-select-mode': selector.sourceType === 'dataset',
                  'has-icon': (selector.sourceType === 'dataset' && selector.selectedDataset) || (selector.sourceType === 'url' && selector.datasetUrl),
                  'source-url-error': selector.sourceType === 'url' && urlValidationResult && !urlValidationResult.isValid,
                  'source-url-success': selector.sourceType === 'url' && urlValidationResult && urlValidationResult.isValid
                }]"
              />
            </div>
            <button 
              :class="['btn btn-outline-secondary dropdown-toggle', {
                'source-url-error': selector.sourceType === 'url' && urlValidationResult && !urlValidationResult.isValid,
                'source-url-success': selector.sourceType === 'url' && urlValidationResult && urlValidationResult.isValid
              }]"
              @click.stop="toggleDropdown"
              type="button"
              :aria-expanded="isDropdownOpen"
            >
              {{ selector.sourceType === 'dataset' ? 'Датасет' : 'URL' }}
            </button>
            <ul v-if="isDropdownOpen" class="dropdown-menu">
              <li>
                <a class="dropdown-item" @click.stop="selectSourceType('dataset')" :class="{ active: selector.sourceType === 'dataset' }">
                  Датасет
                </a>
              </li>
              <li>
                <a class="dropdown-item" @click.stop="selectSourceType('url')" :class="{ active: selector.sourceType === 'url' }">
                  URL
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div v-if="selector.sourceType === 'url' && (isUrlValidating || urlValidationResult)" class="url-validation-result">
          <div v-if="isUrlValidating" class="validation-loading">
            <SpinnerLoading loading-text="Проверка URL..." />
          </div>
          <div v-else-if="urlValidationResult" :class="['validation-message', urlValidationResult.isValid ? 'success-message' : 'error-message']">
            <span class="validation-icon">
              <CheckCircle v-if="urlValidationResult.isValid" size="16" />
              <CircleAlert v-else size="16" />
            </span>
            <div class="validation-content">
              <span class="validation-text">{{ urlValidationResult.message }}</span>
              <div v-if="urlValidationResult.isValid && urlValidationResult.datasetName" class="dataset-info">
                <strong>Датасет:</strong> {{ urlValidationResult.datasetName }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="settings-row" v-if="selector.sourceType === 'dataset' && selector.selectedDataset">
      <div class="settings-label">Поле</div>
      <div class="settings-control">
        <div class="field-selector-container">
          <div class="custom-field-select">
            <button class="field-select-button" @click="toggleFieldDropdown" :class="{ 'open': isFieldDropdownOpen }">
              <FieldTypeIcon v-if="selectedFieldType" :field-type="selectedFieldType" :size="14" class="selected-field-icon"/>
              <span class="field-select-text">
                {{ selectedFieldName || 'Выберите поле' }}
              </span>
              <ChevronDown size="14" class="dropdown-arrow" />
            </button>
            <div v-if="isFieldDropdownOpen" class="field-dropdown-menu">
              <div  v-for="field in availableFields"  :key="field.id" class="field-dropdown-item" :class="{ 'selected': selector.selectedField === field.id }" @click="selectField(field.id)">
                <FieldTypeIcon :field-type="field.type" :size="14" class="field-icon"/>
                <span class="field-name">{{ field.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="settings-row" v-if="selector.sourceType === 'url' && urlValidationResult && urlValidationResult.isValid && selector.selectedDatasetId">
      <div class="settings-label">Поле</div>
      <div class="settings-control">
        <div class="field-selector-container">
          <div class="custom-field-select">
            <button class="field-select-button" @click="toggleFieldDropdown" :class="{ 'open': isFieldDropdownOpen }">
              <FieldTypeIcon 
                v-if="selectedFieldType"
                :field-type="selectedFieldType"
                :size="14"
                class="selected-field-icon"
              />
              <span class="field-select-text">
                {{ selectedFieldName || 'Выберите поле' }}
              </span>
              <ChevronDown size="14" class="dropdown-arrow" />
            </button>
            <div v-if="isFieldDropdownOpen" class="field-dropdown-menu">
              <div 
                v-for="field in availableFields" 
                :key="field.id"
                class="field-dropdown-item"
                :class="{ 'selected': selector.selectedField === field.id }"
                @click="selectField(field.id)"
              >
                <FieldTypeIcon 
                  :field-type="field.type"
                  :size="14"
                  class="field-icon"
                />
                <span class="field-name">{{ field.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Database, ChevronDown, Link, CheckCircle, CircleAlert } from 'lucide-vue-next'
import FieldTypeIcon from '../../components/FieldTypeIcon.vue'
import SpinnerLoading from '@/components/SpinnerLoading.vue'

const props = defineProps({
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
  }
})

const emit = defineEmits([
  'update:sourceInputValue',
  'toggle-dropdown',
  'select-source-type',
  'toggle-field-dropdown',
  'select-field',
  'source-input-click'
])

function handleSourceInputClick() {
  emit('source-input-click')
}

function handleSourceInputChange(event) {
  emit('update:sourceInputValue', event.target.value)
}

function toggleDropdown() {
  emit('toggle-dropdown')
}

function selectSourceType(type) {
  emit('select-source-type', type)
}

function toggleFieldDropdown() {
  emit('toggle-field-dropdown')
}

function selectField(fieldId) {
  emit('select-field', fieldId)
}
</script>

<style scoped lang="scss">
.settings-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: visible;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
}

.settings-row {
  display: flex;
  align-items: flex-start;
  min-height: 40px;
  overflow: visible;
}

.settings-label {
  width: 215px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  padding-right: 16px;
}

.settings-control {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.source-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.input-group {
  display: flex;
  position: relative;
  overflow: visible;
  align-items: stretch;
  width: 100%;
  max-width: 100%;
}

.input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
  height: 31px;
}

.input-icon-wrapper {
  position: absolute;
  left: 16px;
  top: 3%;
  transform: translateY(-50%);
  z-index: 2;
  pointer-events: none;
  width: 0;
  height: 0;
  overflow: visible;
}

.input-icon {
  width: 16px;
  height: 16px;
  color: var(--color-accent);
}

.form-control {
  background: var(--color-background);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 14px;
  width: 100%;
  height: 31px;
  box-sizing: border-box;
  transition: border-color 0.2s ease;
  
  &::placeholder {
    color: var(--color-text-secondary);
  }
  
  &:hover {
    border-color: var(--color-primary-text);
  }
  
  &:focus {
    outline: none;
    border-color: var(--color-primary-text);
    box-shadow: 0 0 0 2px rgba(var(--color-accent-rgb), 0.2);
  }
  
  &.source-select-mode {
    cursor: pointer;
    user-select: none;
    caret-color: transparent;
    
    &:focus {
      outline: none;
      border-color: var(--color-primary-text);
      box-shadow: 0 0 0 2px rgba(var(--color-accent-rgb), 0.2);
    }
  }
  
  &.has-icon {
    padding-left: 40px;
  }
  
  &.source-url-error {
    border-color: var(--color-accent) !important;
    box-shadow: -2px 0 0 0 rgba(var(--color-accent-rgb), 0.2), 0 -2px 0 0 rgba(var(--color-accent-rgb), 0.2), 0 2px 0 0 rgba(var(--color-accent-rgb), 0.2) !important;
    
    &:focus {
      border-color: var(--color-accent) !important;
      box-shadow: -2px 0 0 0 rgba(var(--color-accent-rgb), 0.3), 0 -2px 0 0 rgba(var(--color-accent-rgb), 0.3), 0 2px 0 0 rgba(var(--color-accent-rgb), 0.3) !important;
    }
  }
  
  &.source-url-success {
    border-color: var(--color-success, #22c55e) !important;
    box-shadow: -2px 0 0 0 rgba(34, 197, 94, 0.2), 0 -2px 0 0 rgba(34, 197, 94, 0.2), 0 2px 0 0 rgba(34, 197, 94, 0.2) !important;
    
    &:focus {
      border-color: var(--color-success, #22c55e) !important;
      box-shadow: -2px 0 0 0 rgba(34, 197, 94, 0.3), 0 -2px 0 0 rgba(34, 197, 94, 0.3), 0 2px 0 0 rgba(34, 197, 94, 0.3) !important;
    }
  }
}

.form-control-button {
  &:hover {
    border-color: var(--color-primary-text);
    background-color: var(--color-hover-background);
  }
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  text-align: center;
  text-decoration: none;
  vertical-align: middle;
  cursor: pointer;
  user-select: none;
  border: 1px solid transparent;
  border-radius: 4px;
  box-sizing: border-box;
  transition: all 0.15s ease-in-out;
}

.btn-outline-secondary {
  color: var(--color-text-primary);
  background-color: var(--color-background);
  border-color: var(--color-border);
  border-left: none;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  flex-shrink: 0;
  min-width: 80px;
  height: 31px;
  
  &:hover {
    color: var(--color-text-primary);
    background-color: var(--color-hover-background);
    border-color: var(--color-primary);
  }
  
  &.source-url-error {
    border-color: var(--color-accent) !important;
    box-shadow: 2px 0 0 0 rgba(var(--color-accent-rgb), 0.2), 0 -2px 0 0 rgba(var(--color-accent-rgb), 0.2), 0 2px 0 0 rgba(var(--color-accent-rgb), 0.2) !important;
    
    &:hover {
      border-color: var(--color-accent) !important;
      box-shadow: 2px 0 0 0 rgba(var(--color-accent-rgb), 0.2), 0 -2px 0 0 rgba(var(--color-accent-rgb), 0.2), 0 2px 0 0 rgba(var(--color-accent-rgb), 0.2) !important;
    }
    
    &:focus {
      border-color: var(--color-accent) !important;
      box-shadow: 2px 0 0 0 rgba(var(--color-accent-rgb), 0.3), 0 -2px 0 0 rgba(var(--color-accent-rgb), 0.3), 0 2px 0 0 rgba(var(--color-accent-rgb), 0.3) !important;
    }
  }
  
  &.source-url-success {
    border-color: var(--color-success, #22c55e) !important;
    box-shadow: 2px 0 0 0 rgba(34, 197, 94, 0.2), 0 -2px 0 0 rgba(34, 197, 94, 0.2), 0 2px 0 0 rgba(34, 197, 94, 0.2) !important;
    
    &:hover {
      border-color: var(--color-success, #22c55e) !important;
      box-shadow: 2px 0 0 0 rgba(34, 197, 94, 0.2), 0 -2px 0 0 rgba(34, 197, 94, 0.2), 0 2px 0 0 rgba(34, 197, 94, 0.2) !important;
    }
    
    &:focus {
      border-color: var(--color-success, #22c55e) !important;
      box-shadow: 2px 0 0 0 rgba(34, 197, 94, 0.3), 0 -2px 0 0 rgba(34, 197, 94, 0.3), 0 2px 0 0 rgba(34, 197, 94, 0.3) !important;
    }
  }
}

.dropdown-toggle {
  position: relative;
  
  &::after {
    content: '';
    display: inline-block;
    margin-left: 6px;
    vertical-align: middle;
    border-top: 4px solid;
    border-right: 4px solid transparent;
    border-bottom: 0;
    border-left: 4px solid transparent;
  }
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 9999;
  display: block;
  min-width: 120px;
  margin: 2px 0 0 0;
  padding: 0.5rem 0;
  background-color: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  list-style: none;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 8px 12px;
  clear: both;
  font-weight: 400;
  color: var(--color-text-primary);
  text-align: inherit;
  text-decoration: none;
  white-space: nowrap;
  background-color: transparent;
  border: 0;
  cursor: pointer;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: var(--color-hover-background);
    color: var(--color-text-primary);
  }
  
  &.active {
    background-color: var(--bs-primary-border-subtle);
    color: white;
    
    &:hover {
      background-color: var(--bs-primary);
      color: white;
    }
  }
}

.url-validation-result {
  background-color: transparent;
  border: none;
  display: flex;
  align-items: center;
  gap: 0;
  font-size: 13px;
}

.validation-loading {
  display: flex;
  align-items: center;
  width: 100%;
}

.validation-message {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  width: 100%;
}

.validation-icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
}

.validation-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.dataset-info {
  font-size: 12px;
  opacity: 0.8;
  margin-top: 2px;
  
  strong {
    font-weight: 600;
  }
}

.success-message {
  color: #22c55e;
  display: flex;
  align-items: center;
  
  .validation-icon {
    color: #22c55e;
    display: flex;
  }
}

.error-message {
  color: #ef4444;
  display: flex;
  align-items: center;
  
  .validation-icon {
    color: #ef4444;
    display: flex;
  }
}

.field-selector-container {
  position: relative;
  width: 100%;
}

.custom-field-select {
  position: relative;
  width: 100%;
}

.field-select-button {
  width: 100%;
  height: 31px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--color-primary);
  }
  
  &.open {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }
}

.field-select-text {
  flex: 1;
  text-align: left;
}

.selected-field-icon {
  margin-right: 8px;
  margin-left: 0;
}

.dropdown-arrow {
  color: var(--color-text-secondary);
  transition: transform 0.2s ease;
  
  .open & {
    transform: rotate(180deg);
  }
}

.field-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
  margin-top: 2px;
}

.field-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  
  &:hover {
    background: var(--color-hover-background);
  }
  
  &.selected {
    background: var(--color-primary-background);
    color: white;
    
    .field-icon {
      color: white;
    }
  }
}

.field-name {
  flex: 1;
  color: var(--color-primary-text);
  text-align: left;
  font-size: 14px;
}

.field-icon {
  flex-shrink: 0;
}
</style>
