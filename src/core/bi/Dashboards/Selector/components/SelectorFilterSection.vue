<template>
  <div class="settings-section">
    <h6 class="section-title">Фильтрация</h6>
    
    <div class="settings-row">
      <div class="settings-label">Тип селектора</div>
      <div class="settings-control">
        <div class="selector-type-dropdown">
          <button class="selector-type-toggle" @click="toggleSelectorTypeDropdown" :class="{ 'open': isSelectorTypeDropdownOpen }">
            <span class="selector-type-icon">
              <List v-if="selector.selectorType === 'list'" size="16" />
              <Type v-else-if="selector.selectorType === 'input'" size="16" />
              <Calendar v-else-if="selector.selectorType === 'calendar'" size="16" />
              <CheckSquare v-else-if="selector.selectorType === 'checkbox'" size="16" />
              <ChevronDown v-else size="16" />
            </span>
            <span class="selector-type-text">
              {{ selectorTypeLabel }}
            </span>
            <ChevronDown size="14" class="dropdown-arrow" />
          </button>
          <div v-if="isSelectorTypeDropdownOpen" class="selector-type-menu">
            <div 
              v-for="type in selectorTypesWithAvailability" 
              :key="type.value"
              class="selector-type-option"
              :class="{ 
                'active': selector.selectorType === type.value,
                'disabled': !type.isAvailable
              }"
              @click="type.isAvailable ? selectSelectorType(type.value) : null"
              :title="!type.isAvailable ? type.disabledReason : ''"
            >
              <span class="selector-type-icon">
                <List v-if="type.value === 'list'" size="16" />
                <Type v-else-if="type.value === 'input'" size="16" />
                <Calendar v-else-if="type.value === 'calendar'" size="16" />
                <CheckSquare v-else-if="type.value === 'checkbox'" size="16" />
              </span>
              <span class="selector-type-text">{{ type.label }}</span>
              <span v-if="!type.isAvailable" class="disabled-indicator">
                <Info size="12" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="settings-row">
      <div class="settings-label">
        Операция
      </div>
      <div class="settings-control">
        <div class="operation-dropdown">
          <button class="operation-toggle" @click="toggleOperationDropdown" :class="{ 'open': isOperationDropdownOpen }">
            <span class="operation-text">
              {{ currentOperationLabel }}
            </span>
            <ChevronDown size="14" class="dropdown-arrow" />
          </button>
          <div v-if="isOperationDropdownOpen" class="operation-menu">
            <div 
              v-for="operation in availableOperations" 
              :key="operation.value"
              class="operation-option"
              :class="{ 'active': selector.operation === operation.value }"
              @click="selectOperation(operation.value)"
            >
              <span class="operation-text">{{ operation.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="settings-row" v-if="selector.selectorType === 'list'">
      <div class="settings-label">
        <input type="checkbox" :checked="selector.multipleSelection" @change="updateMultipleSelection" />
        Множественный выбор
      </div>
    </div>
    
    <div class="settings-row">
      <div class="settings-label">Значение по умолчанию</div>
      <div class="settings-control">
        <!-- Показываем DefaultValueSelector для списков -->
        <div v-if="shouldShowDefaultValueSelector && selector.selectorType === 'list'" class="default-value-selector-container">
          <DefaultValueSelector
            :dataset-id="Number(selector.selectedDatasetId)"
            :field-id="Number(selector.selectedField)"
            :model-value="selector.defaultValue"
            @update:model-value="updateDefaultValue"
            :multiple-selection="selector.multipleSelection"
            :placeholder="selector.required ? 'Выберите значения по умолчанию (обязательно)' : 'Выберите значения по умолчанию'"
            :class="{ 'is-invalid': selector.required && (!selector.defaultValue || selector.defaultValue.length === 0) }"
          />
          <div v-if="selector.required && (!selector.defaultValue || selector.defaultValue.length === 0)" class="invalid-feedback">
            Это поле обязательно для заполнения
          </div>
        </div>
        <!-- Показываем обычный инпут для поля ввода -->
        <div v-else-if="selector.selectorType === 'input'" class="default-input-container">
          <input 
            :value="selector.inputDefaultValue"
            @input="updateInputDefaultValue"
            type="text" 
            class="form-control input-sm"
            placeholder="Введите значение по умолчанию"
            :class="{ 'is-invalid': selector.required && !selector.inputDefaultValue }"
          />
          <div v-if="selector.required && !selector.inputDefaultValue" class="invalid-feedback">
            Это поле обязательно для заполнения
          </div>
        </div>
        <!-- Сообщение когда поле не выбрано -->
        <div v-else-if="!shouldShowDefaultValueSelector" class="no-field-selected">
          <span class="text-muted">Сначала выберите поле датасета</span>
        </div>
        <!-- Для других типов селекторов пока что показываем заглушку -->
        <div v-else class="other-selector-type">
          <span class="text-muted">Настройка значений по умолчанию для данного типа селектора пока не поддерживается</span>
        </div>
      </div>
    </div>
    
    <div class="settings-row">
      <div class="settings-label">
        <input type="checkbox" :checked="selector.required" @change="updateRequired" />
        Обязательное поле
      </div>
    </div>
  </div>
</template>

<script setup>
import { ChevronDown, List, Type, Calendar, CheckSquare, Info } from 'lucide-vue-next'
import DefaultValueSelector from '../../components/DefaultValueSelector.vue'

const props = defineProps({
  selector: {
    type: Object,
    required: true
  },
  isSelectorTypeDropdownOpen: {
    type: Boolean,
    default: false
  },
  isOperationDropdownOpen: {
    type: Boolean,
    default: false
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

const emit = defineEmits([
  'toggle-selector-type-dropdown',
  'select-selector-type',
  'toggle-operation-dropdown',
  'select-operation',
  'update:selector'
])

function toggleSelectorTypeDropdown() {
  emit('toggle-selector-type-dropdown')
}

function selectSelectorType(type) {
  emit('select-selector-type', type)
}

function toggleOperationDropdown() {
  emit('toggle-operation-dropdown')
}

function selectOperation(operationValue) {
  emit('select-operation', operationValue)
}

function updateMultipleSelection(event) {
  emit('update:selector', {
    ...props.selector,
    multipleSelection: event.target.checked
  })
}

function updateDefaultValue(value) {
  emit('update:selector', {
    ...props.selector,
    defaultValue: value
  })
}

function updateInputDefaultValue(event) {
  emit('update:selector', {
    ...props.selector,
    inputDefaultValue: event.target.value
  })
}

function updateRequired(event) {
  emit('update:selector', {
    ...props.selector,
    required: event.target.checked
  })
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
  
  input[type="checkbox"] {
    margin: 0;
    accent-color: var(--color-accent);
  }
}

.settings-control {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selector-type-dropdown {
  position: relative;
  width: 100%;
}

.selector-type-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 31px;
  padding: 8px 12px;
  background: var(--color-background);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--color-primary-text);
  }
  
  &.open {
    border-color: var(--color-primary-text);
    box-shadow: 0 0 0 2px rgba(var(--color-accent-rgb), 0.2);
  }
}

.selector-type-icon {
  display: flex;
  align-items: center;
  color: var(--color-accent);
}

.selector-type-text {
  color: var(--color-primary-text);
  flex: 1;
  text-align: left;
}

.dropdown-arrow {
  color: var(--color-text-secondary);
  transition: transform 0.2s ease;
}

.selector-type-toggle.open .dropdown-arrow {
  transform: rotate(180deg);
}

.selector-type-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 10000;
  margin-top: 2px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.selector-type-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  
  &:hover {
    background: var(--color-hover-background);
  }
  
  &.active {
    background: var(--color-primary-background);
    color: white;
    
    .selector-type-icon {
      color: white;
    }
  }
  
  .selector-type-icon {
    color: var(--color-accent);
    transition: color 0.2s ease;
  }
  
  &:hover .selector-type-icon {
    color: var(--color-accent);
  }
  
  &.active .selector-type-icon {
    color: white;
  }
  
  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    color: var(--color-text-secondary);
    
    &:hover {
      background: transparent;
    }
    
    .selector-type-icon {
      color: var(--color-text-secondary);
    }
    
    &:hover .selector-type-icon {
      color: var(--color-text-secondary);
    }
  }
}

.disabled-indicator {
  margin-left: auto;
  color: var(--color-text-secondary);
  opacity: 0.7;
}

.operation-dropdown {
  position: relative;
  width: 100%;
}

.operation-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 31px;
  padding: 8px 12px;
  background: var(--color-background);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--color-primary-text);
  }
  
  &.open {
    border-color: var(--color-primary-text);
    box-shadow: 0 0 0 2px rgba(var(--color-accent-rgb), 0.2);
  }
}

.operation-text {
  flex: 1;
  text-align: left;
  font-size: 14px;
}

.operation-toggle.open .dropdown-arrow {
  transform: rotate(180deg);
}

.operation-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  max-height: 200px;
  overflow-y: auto;
  margin-top: 2px;
}

.operation-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  
  &:hover {
    background: var(--color-hover-background);
  }
  
  &.active {
    background: var(--color-primary-background);
    color: white;
  }
}

.default-value-selector-container {
  width: 100%;
  
  &.is-invalid {
    :deep(.default-value-selector) {
      border-color: #ef4444 !important;
      box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2) !important;
      
      &:hover {
        border-color: #ef4444 !important;
        box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2) !important;
      }
      
      &:focus-within {
        border-color: #ef4444 !important;
        box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.3) !important;
      }
    }
  }
}

.default-input-container {
  width: 100%;
  
  .form-control.input-sm {
    height: 31px;
    font-size: 14px;
    padding: 4px 12px;
  }
}

.invalid-feedback {
  display: block;
  color: #ef4444;
  font-size: 12px;
  font-weight: 500;
  margin-top: 4px;
  padding-left: 4px;
}

.no-field-selected {
  display: flex;
  align-items: center;
  height: 31px;
  padding: 4px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background-muted);
  
  .text-muted {
    color: var(--color-text-secondary);
    font-size: 14px;
  }
}

.other-selector-type {
  display: flex;
  align-items: center;
  height: 31px;
  padding: 4px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background-muted);
  
  .text-muted {
    color: var(--color-text-secondary);
    font-size: 14px;
  }
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
  
  &.is-invalid {
    border-color: #ef4444 !important;
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2) !important;
    
    &:hover {
      border-color: #ef4444 !important;
      box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2) !important;
    }
    
    &:focus {
      border-color: #ef4444 !important;
      box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.3) !important;
    }
  }
}
</style>
