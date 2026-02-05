<template>
  <div class="widget-settings">
    <SelectorListPanel
      :selectors-list="selectorsList"
      :active-selector-index="activeSelectorIndex"
      :dragged-index="draggedIndex"
      :drag-over-index="dragOverIndex"
      :on-drag-start="handleDragStart"
      :on-drag-over="handleDragOver"
      :on-drop="handleDrop"
      :on-drag-enter="handleDragEnter"
      :on-drag-leave="handleDragLeave"
      :on-drag-end="handleDragEnd"
      :on-set-active-selector="setActiveSelector"
      :on-toggle-favorite="toggleFavorite"
      :on-remove-selector="removeSelector"
      :on-add-selector="addNewSelector"
      :on-open-advanced-settings="openAdvancedSettings"
    />
    <div class="widget-settings-right-side">
      <div class="widget-settings-right-side-header">
        <h5 class="widget-settings-right-side-title">Настройки селектора</h5>
        <button class="close-btn" @click="onCancel" title="Закрыть">
          <span class="close-icon">×</span>
        </button>
      </div>
      <div class="widget-settings-right-side-content">
        <SelectorSectionList
          :selector="currentSelector"
          :source-input-value="sourceInputValue"
          :source-input-placeholder="sourceInputPlaceholder"
          :is-dropdown-open="isDropdownOpen"
          :is-field-dropdown-open="isFieldDropdownOpen"
          :is-selector-type-dropdown-open="isSelectorTypeDropdownOpen"
          :is-operation-dropdown-open="isOperationDropdownOpen"
          :available-fields="availableFields"
          :selected-field-type="selectedFieldType"
          :selected-field-name="selectedFieldName"
          :is-url-validating="isUrlValidating"
          :url-validation-result="urlValidationResult"
          :selector-types-with-availability="selectorTypesWithAvailability"
          :selector-type-label="getSelectorTypeLabel(currentSelector.selectorType)"
          :available-operations="availableOperations"
          :current-operation-label="currentOperationLabel"
          :should-show-default-value-selector="shouldShowDefaultValueSelector"
          @update:selector="updateCurrentSelector"
          @update:sourceInputValue="sourceInputValue = $event"
          @toggle-dropdown="toggleDropdown"
          @select-source-type="selectSourceType"
          @toggle-field-dropdown="toggleFieldDropdown"
          @select-field="selectField"
          @source-input-click="handleSourceInputClick"
          @toggle-selector-type-dropdown="toggleSelectorTypeDropdown"
          @select-selector-type="selectSelectorType"
          @toggle-operation-dropdown="toggleOperationDropdown"
          @select-operation="selectOperation"
        />
      </div>
      <div class="widget-settings-right-side-actions">
        <div v-if="!isFormValid && validationMessage" class="validation-hint" :class="{ 'clickable': invalidSelectorIndex !== activeSelectorIndex }" @click="goToInvalidSelector">
          <CircleAlert size="14" class="hint-icon" />
          <span class="hint-text">{{ validationMessage }}</span>
          <span v-if="invalidSelectorIndex !== activeSelectorIndex" class="hint-action">Нажмите для перехода</span>
        </div>
        <div class="action-buttons">
          <button @click="onCancel" class="cancel">Отменить</button>
          <button class="btn btn-primary" @click="onSubmit" :disabled="!isFormValid">Сохранить</button>
        </div>
      </div>
    </div>
    
    <div v-if="isDatasetModalOpen" class="dataset-modal-overlay" @click.self="closeDatasetModal">
      <div class="dataset-modal-container">
        <div class="dataset-modal-header">
          <h6 class="dataset-modal-title">Выбор датасета</h6>
          <button class="dataset-modal-close" @click="closeDatasetModal" title="Закрыть">
            <span class="close-icon">×</span>
          </button>
        </div>
        <div class="dataset-modal-content">
          <DatasetsTooltip :selected-dataset="currentSelector.selectedDataset ? { name: currentSelector.selectedDataset, id: currentSelector.selectedDatasetId } : null" :datasets="availableDatasets" :is-loading="isDatasetsLoading" @select="selectDataset"/>
        </div>
      </div>
    </div>

    <SelectorGroupSettingsModal v-if="isAdvancedSettingsModalOpen" :settings="selectorGroupSettings" @update:settings="updateSelectorGroupSettings" @close="closeAdvancedSettings" @save="saveAdvancedSettings"/>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { CircleAlert, } from 'lucide-vue-next';
import DatasetsTooltip from '../../Charts/components/DatasetsTooltip.vue';
import SelectorListPanel from './components/SelectorListPanel.vue';
import SelectorGroupSettingsModal from './components/SelectorGroupSettingsModal.vue';
import SelectorSectionList from './components/SelectorSectionList.vue';
import datasetService from '../../MainPage/Sidebar/components/js/datasetService.js';
import { validateDatasetUrlWithAccess } from './js/datasetUrlUtils.js';
import { apiClient } from '@/js/api/manager.js';

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['close', 'save']);

const selectorsList = ref([
  {
    id: 1,
    title: 'Селектор 1',
    titlePosition: 'left',
    showInternalTitle: false,
    internalTitle: '',
    showColorAccent: false,
    showHint: false,
    hintText: '',
    sourceType: 'dataset',
    selectedDataset: '',
    selectedDatasetId: null,
    selectedField: '',
    selectorType: 'list',
    operation: '',
    multipleSelection: false,
    defaultValue: [],
    required: false,
    isFavorite: true
  }
]);

const activeSelectorIndex = ref(0);
const draggedIndex = ref(null);
const dragOverIndex = ref(null);
const isDatasetModalOpen = ref(false);
const isAdvancedSettingsModalOpen = ref(false);
const availableDatasets = ref([]);
const availableFields = ref([]);
const selectorOptions = ref([]);
const isDatasetsLoading = ref(false);

const originalData = ref(null);

const selectorGroupSettings = ref({
  applyButton: false,
  clearButton: false,
  autoHeight: false
});

const currentSelector = computed(() => {
  return selectorsList.value[activeSelectorIndex.value] || {};
});

function validateSelector(selector, isCurrentSelector = false) {
  if (!selector.title || selector.title.trim().length === 0) {
    return false;
  }
  
  if (selector.sourceType === 'dataset') {
    if (!selector.selectedDataset || !selector.selectedDatasetId) {
      return false;
    }
  } else if (selector.sourceType === 'url') {
    if (isCurrentSelector) {
      if (!urlValidationResult.value || !urlValidationResult.value.isValid || !selector.selectedDatasetId) {
        return false;
      }
    } else {
      if (!selector.selectedDatasetId) {
        return false;
      }
    }
  }
  
  if (!selector.selectedField) {
    return false;
  }
  
  if (selector.required) {
    if (!selector.defaultValue || 
        (Array.isArray(selector.defaultValue) && selector.defaultValue.length === 0) ||
        (typeof selector.defaultValue === 'string' && selector.defaultValue.trim().length === 0)) {
      return false;
    }
  }
  
  return true;
}

const isFormValid = computed(() => {
  for (let i = 0; i < selectorsList.value.length; i++) {
    const selector = selectorsList.value[i];
    const isCurrentSelector = i === activeSelectorIndex.value;
    
    if (!validateSelector(selector, isCurrentSelector)) {
      return false;
    }
  }
  
  return true;
});

const validationMessage = computed(() => {
  for (let i = 0; i < selectorsList.value.length; i++) {
    const selector = selectorsList.value[i];
    const isCurrentSelector = i === activeSelectorIndex.value;
    const selectorNumber = i + 1;
    
    if (!selector.title || selector.title.trim().length === 0) {
      return `Селектор ${selectorNumber}: Заполните заголовок`;
    }
    
    if (selector.sourceType === 'dataset') {
      if (!selector.selectedDataset || !selector.selectedDatasetId) {
        return `Селектор ${selectorNumber}: Выберите датасет`;
      }
    } else if (selector.sourceType === 'url') {
      if (isCurrentSelector) {
        if (!urlValidationResult.value || !urlValidationResult.value.isValid) {
          return `Селектор ${selectorNumber}: Введите корректный URL датасета`;
        }
        if (!selector.selectedDatasetId) {
          return `Селектор ${selectorNumber}: Дождитесь загрузки данных датасета`;
        }
      } else {
        if (!selector.selectedDatasetId) {
          return `Селектор ${selectorNumber}: Настройте источник данных (URL)`;
        }
      }
    }
    
    if (!selector.selectedField) {
      return `Селектор ${selectorNumber}: Выберите поле датасета`;
    }
    
    if (selector.required) {
      if (!selector.defaultValue || 
          (Array.isArray(selector.defaultValue) && selector.defaultValue.length === 0) ||
          (typeof selector.defaultValue === 'string' && selector.defaultValue.trim().length === 0)) {
        return `Селектор ${selectorNumber}: Выберите значение по умолчанию (обязательный)`;
      }
    }
  }
  
  return '';
});

const invalidSelectorIndex = computed(() => {
  for (let i = 0; i < selectorsList.value.length; i++) {
    const selector = selectorsList.value[i];
    const isCurrentSelector = i === activeSelectorIndex.value;
    
    if (!validateSelector(selector, isCurrentSelector)) {
      return i;
    }
  }
  
  return -1;
});

function goToInvalidSelector() {
  if (invalidSelectorIndex.value >= 0) {
    activeSelectorIndex.value = invalidSelectorIndex.value;
  }
}

const sourceInputValue = ref('');

const sourceInputPlaceholder = computed(() => {
  if (currentSelector.value.sourceType === 'dataset') {
    return 'Выберите датасет';
  } else if (currentSelector.value.sourceType === 'url') {
    return 'Введите URL источника данных';
  }
  return '';
});

const selectedFieldType = computed(() => {
  if (!currentSelector.value.selectedField) return null;
  
  const selectedFieldId = String(currentSelector.value.selectedField);
  const selectedField = availableFields.value.find(field => String(field.id) === selectedFieldId);
  return selectedField ? selectedField.type : null;
});

const selectedFieldName = computed(() => {
  if (!currentSelector.value.selectedField) return null;
  
  const selectedFieldId = String(currentSelector.value.selectedField);
  const selectedField = availableFields.value.find(field => String(field.id) === selectedFieldId);
  return selectedField ? selectedField.name : null;
});

const shouldShowDefaultValueSelector = computed(() => {
  const hasField = currentSelector.value.selectedField && 
                   currentSelector.value.selectedField !== '' && 
                   currentSelector.value.selectedField !== null;
  const hasDataset = currentSelector.value.selectedDatasetId && 
                     currentSelector.value.selectedDatasetId !== '' && 
                     currentSelector.value.selectedDatasetId !== null;
  
  return hasField && hasDataset;
});

const isDropdownOpen = ref(false);
const isSelectorTypeDropdownOpen = ref(false);
const isFieldDropdownOpen = ref(false);
const isOperationDropdownOpen = ref(false);
const isUrlValidating = ref(false);
const urlValidationResult = ref(null);

const selectorTypes = ref([
  { value: 'list', label: 'Список', icon: 'List' },
  { value: 'input', label: 'Поле ввода', icon: 'Type' },
  { value: 'calendar', label: 'Календарь', icon: 'Calendar' },
  { value: 'checkbox', label: 'Чекбокс', icon: 'CheckSquare' }
]);

const selectorTypesWithAvailability = computed(() => {
  const fieldType = selectedFieldType.value;
  
  return selectorTypes.value.map(selectorType => {
    let isAvailable = true;
    let disabledReason = '';
    
    if (selectorType.value === 'calendar') {
      isAvailable = fieldType === 'date&time';
      if (!isAvailable) {
        disabledReason = 'Доступно только для полей типа "Дата и время"';
      }
    }
    
    if (selectorType.value === 'checkbox') {
      isAvailable = fieldType === 'bool';
      if (!isAvailable) {
        disabledReason = 'Доступно только для полей типа "Логический"';
      }
    }
    
    return {
      ...selectorType,
      isAvailable,
      disabledReason
    };
  });
});

const availableSelectorTypes = computed(() => {
  return selectorTypesWithAvailability.value.filter(type => type.isAvailable);
});

const allOperations = ref([
  { value: 'equals', label: 'Равно', applicableTypes: ['string', 'integer', 'float', 'date', 'date&time', 'bool'] },
  { value: 'in', label: 'Принадлежит множеству', applicableTypes: ['string'] },
  { value: 'not_in', label: 'Не принадлежит множеству', applicableTypes: ['string'] },
  { value: 'contains', label: 'Содержит', applicableTypes: ['string'] },
  { value: 'starts_with', label: 'Начинается с', applicableTypes: ['string'] },
  { value: 'ends_with', label: 'Заканчивается на', applicableTypes: ['string'] },
  { value: 'greater_than', label: 'Больше', applicableTypes: ['integer', 'float', 'date', 'date&time'] },
  { value: 'less_than', label: 'Меньше', applicableTypes: ['integer', 'float', 'date', 'date&time'] },
  { value: 'between', label: 'Между', applicableTypes: ['integer', 'float', 'date', 'date&time'] },
  { value: 'greater_than_or_equal', label: 'Больше или равно', applicableTypes: ['integer', 'float', 'date', 'date&time'] },
  { value: 'less_than_or_equal', label: 'Меньше или равно', applicableTypes: ['integer', 'float', 'date', 'date&time'] },
  { value: 'is_true', label: 'Истина', applicableTypes: ['bool'] },
  { value: 'is_false', label: 'Ложь', applicableTypes: ['bool'] }
]);

const availableOperations = computed(() => {
  const fieldType = selectedFieldType.value;
  
  if (!fieldType) {
    return [];
  }
  
  return allOperations.value.filter(operation => 
    operation.applicableTypes.includes(fieldType)
  );
});

const currentOperationLabel = computed(() => {
  if (!currentSelector.value?.operation) {
    return '—';
  }
  
  const operation = allOperations.value.find(op => op.value === currentSelector.value.operation);
  return operation ? operation.label : '—';
});

function createNewSelector() {
  return {
    id: Date.now() + Math.random(),
    title: `Селектор ${selectorsList.value.length + 1}`,
    titlePosition: 'left',
    showInternalTitle: false,
    internalTitle: '',
    showColorAccent: false,
    showHint: false,
    hintText: '',
    sourceType: 'dataset',
    selectedDataset: '',
    selectedDatasetId: null,
    datasetUrl: '',
    selectedField: '',
    selectorType: 'list',
    operation: '',
    multipleSelection: false,
    defaultValue: [],
    inputDefaultValue: '',
    required: false,
    isFavorite: false
  };
}

function addNewSelector() {
  const newSelector = createNewSelector();
  selectorsList.value.push(newSelector);
  activeSelectorIndex.value = selectorsList.value.length - 1;
}

function removeSelector(index) {
  if (selectorsList.value.length <= 1) return;
  
  const wasRemovalFavorite = selectorsList.value[index].isFavorite;
  
  selectorsList.value.splice(index, 1);
  
  if (wasRemovalFavorite && selectorsList.value.length > 0) {
    selectorsList.value[0].isFavorite = true;
  }
  
  if (activeSelectorIndex.value >= selectorsList.value.length) {
    activeSelectorIndex.value = selectorsList.value.length - 1;
  } else if (activeSelectorIndex.value > index) {
    activeSelectorIndex.value--;
  }
}

function setActiveSelector(index) {
  activeSelectorIndex.value = index;
}

function handleDragStart(index, event) {
  draggedIndex.value = index;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', index.toString());
  
  setTimeout(() => {
    if (event.target) {
      event.target.style.opacity = '0.5';
    }
  }, 0);
}

function handleDragOver(index, event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(index, event) {
  event.preventDefault();
  if (draggedIndex.value !== null && draggedIndex.value !== index) {
    dragOverIndex.value = index;
  }
}

function handleDragLeave(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    dragOverIndex.value = null;
  }
}

function handleDrop(targetIndex, event) {
  event.preventDefault();
  
  if (draggedIndex.value === null || draggedIndex.value === targetIndex) {
    return;
  }
  
  const draggedSelector = selectorsList.value[draggedIndex.value];
  selectorsList.value.splice(draggedIndex.value, 1);
  selectorsList.value.splice(targetIndex, 0, draggedSelector);
  
  if (activeSelectorIndex.value === draggedIndex.value) {
    activeSelectorIndex.value = targetIndex;
  } else if (activeSelectorIndex.value > draggedIndex.value && activeSelectorIndex.value <= targetIndex) {
    activeSelectorIndex.value--;
  } else if (activeSelectorIndex.value < draggedIndex.value && activeSelectorIndex.value >= targetIndex) {
    activeSelectorIndex.value++;
  }
  
  draggedIndex.value = null;
  dragOverIndex.value = null;
}

function handleDragEnd(event) {
  if (event.target) {
    event.target.style.opacity = '';
  }
  draggedIndex.value = null;
  dragOverIndex.value = null;
}

function toggleFavorite(index) {
  if (selectorsList.value[index].isFavorite) {
    return;
  }
  
  selectorsList.value.forEach((selector, i) => {
    selector.isFavorite = i === index;
  });
}

function openAdvancedSettings() {
  isAdvancedSettingsModalOpen.value = true;
}

function closeAdvancedSettings() {
  isAdvancedSettingsModalOpen.value = false;
}

function saveAdvancedSettings() {
  closeAdvancedSettings();
}

function updateSelectorGroupSettings(newSettings) {
  selectorGroupSettings.value = newSettings;
}

function openDatasetModal() {
  isDatasetModalOpen.value = true;
  availableDatasets.value = [];
  loadAvailableDatasets();
}

function closeDatasetModal() {
  isDatasetModalOpen.value = false;
}

async function loadAvailableDatasets() {
  try {
    isDatasetsLoading.value = true;
    const response = await datasetService.getUserDatasets();
    availableDatasets.value = response.data || [];
  } catch (error) {
    availableDatasets.value = [];
  } finally {
    isDatasetsLoading.value = false;
  }
}

function selectDataset(dataset) {
  const availableDatasetIds = availableDatasets.value.map(d => d.id);
  if (!availableDatasetIds.includes(dataset.id)) {
    return;
  }
  
  currentSelector.value.selectedDataset = dataset.name;
  currentSelector.value.selectedDatasetId = dataset.id;
  currentSelector.value.sourceType = 'dataset';
  currentSelector.value.datasetUrl = '';
  currentSelector.value.selectedField = '';
  
  sourceInputValue.value = dataset.name;
  
  urlValidationResult.value = null;
  isUrlValidating.value = false;
  isDropdownOpen.value = false;
  closeDatasetModal();
  loadAvailableFields();
}

async function loadAvailableFields() {
  if (!currentSelector.value.selectedDatasetId) {
    availableFields.value = [];
    return;
  }
  
  try {
    const response = await datasetService.listFields({ dataset: currentSelector.value.selectedDatasetId });
    availableFields.value = response.data || [];
  } catch (error) {
    availableFields.value = [];
  }
}

function updateCurrentSelector(updatedSelector) {
  selectorsList.value[activeSelectorIndex.value] = { ...updatedSelector };
}

function setTitlePosition(position) {
  currentSelector.value.titlePosition = position;
}

function toggleDropdown() {
  isDropdownOpen.value = !isDropdownOpen.value;
}

function toggleSelectorTypeDropdown() {
  isSelectorTypeDropdownOpen.value = !isSelectorTypeDropdownOpen.value;
}

function toggleFieldDropdown() {
  isFieldDropdownOpen.value = !isFieldDropdownOpen.value;
}

function toggleOperationDropdown() {
  isOperationDropdownOpen.value = !isOperationDropdownOpen.value;
}

function selectField(fieldId) {
  currentSelector.value.selectedField = fieldId;
  isFieldDropdownOpen.value = false;
}

function selectOperation(operationValue) {
  currentSelector.value.operation = operationValue;
  isOperationDropdownOpen.value = false;
}

function selectSelectorType(type) {
  const selectorType = selectorTypesWithAvailability.value.find(t => t.value === type);
  
  if (!selectorType || !selectorType.isAvailable) {
    return;
  }
  
  currentSelector.value.selectorType = type;
  isSelectorTypeDropdownOpen.value = false;
  
  if (type === 'input') {
    currentSelector.value.multipleSelection = false;
  }
}

function getSelectorTypeLabel(type) {
  const selectorType = selectorTypes.value.find(t => t.value === type);
  return selectorType ? selectorType.label : 'Выберите тип';
}

function selectSourceType(type) {
  currentSelector.value.sourceType = type;
  isDropdownOpen.value = false;
  urlValidationResult.value = null;
  isUrlValidating.value = false;
  
  if (type === 'dataset') {
    currentSelector.value.datasetUrl = '';
    currentSelector.value.selectedField = '';
  } else if (type === 'url') {
    currentSelector.value.selectedDataset = '';
    currentSelector.value.selectedDatasetId = null;
    currentSelector.value.selectedField = '';
  }
}

function handleSourceInputClick() {
  if (currentSelector.value.sourceType === 'dataset') {
    openDatasetModal();
  }
}

let validationTimeout = null;

function validateUrl(url) {
  if (validationTimeout) {
    clearTimeout(validationTimeout);
  }
  
  isUrlValidating.value = true;
  urlValidationResult.value = null;
  
  if (!url || !url.trim()) {
    isUrlValidating.value = false;
    return;
  }
  
  validationTimeout = setTimeout(async () => {
    try {
      const result = await validateDatasetUrlWithAccess(url.trim(), apiClient, true);
      
      urlValidationResult.value = {
        isValid: result.isValid,
        message: result.isValid ? 'URL датасета корректен!' : result.error,
        datasetId: result.datasetId,
        datasetName: result.datasetName
      };
      
      if (result.isValid) {
        currentSelector.value.selectedDatasetId = result.datasetId;
        currentSelector.value.selectedDataset = result.datasetName;
        
        if (currentSelector.value.sourceType === 'url') {
          sourceInputValue.value = currentSelector.value.datasetUrl;
        }
        
        loadAvailableFields();
      }
      
    } catch (error) {
      console.error('Ошибка при валидации URL датасета:', error);
      urlValidationResult.value = {
        isValid: false,
        message: 'Произошла ошибка при проверке URL',
        datasetId: null,
        datasetName: null
      };
    } finally {
      isUrlValidating.value = false;
    }
  }, 500);
}

function handleClickOutside(event) {
  if (!isDropdownOpen.value && !isSelectorTypeDropdownOpen.value && !isFieldDropdownOpen.value && !isOperationDropdownOpen.value) {
    return;
  }
  
  const dropdownToggle = event.target.closest('.dropdown-toggle');
  const dropdownMenu = event.target.closest('.dropdown-menu');
  const selectorTypeToggle = event.target.closest('.selector-type-toggle');
  const selectorTypeMenu = event.target.closest('.selector-type-menu');
  const fieldSelectButton = event.target.closest('.field-select-button');
  const fieldDropdownMenu = event.target.closest('.field-dropdown-menu');
  const operationToggle = event.target.closest('.operation-toggle');
  const operationMenu = event.target.closest('.operation-menu');
   
  if (dropdownToggle || dropdownMenu) {
    return;
  }
  
  if (selectorTypeToggle || selectorTypeMenu) {
    return;
  }
  
  if (fieldSelectButton || fieldDropdownMenu) {
    return;
  }
  
  if (operationToggle || operationMenu) {
    return;
  }
  
  isDropdownOpen.value = false;
  isSelectorTypeDropdownOpen.value = false;
  isFieldDropdownOpen.value = false;
  isOperationDropdownOpen.value = false;
}

function handleKeyDown(event) {
  if (event.key === 'Escape') {
    if (isAdvancedSettingsModalOpen.value) {
      isAdvancedSettingsModalOpen.value = false;
    } else if (isDatasetModalOpen.value) {
      isDatasetModalOpen.value = false;
    } else if (isDropdownOpen.value) {
      isDropdownOpen.value = false;
    } else if (isSelectorTypeDropdownOpen.value) {
      isSelectorTypeDropdownOpen.value = false;
    } else if (isFieldDropdownOpen.value) {
      isFieldDropdownOpen.value = false;
    } else if (isOperationDropdownOpen.value) {
      isOperationDropdownOpen.value = false;
    }
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true);
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside, true);
  document.removeEventListener('keydown', handleKeyDown);
  
  if (validationTimeout) {
    clearTimeout(validationTimeout);
  }
});

watch(() => props.data, (newData) => {
  if (newData && newData.selectorsList) {
    originalData.value = JSON.parse(JSON.stringify(newData));
    
    selectorsList.value = JSON.parse(JSON.stringify(newData.selectorsList));
    activeSelectorIndex.value = newData.activeSelectorIndex || 0;

    if (newData.selectorGroupSettings) {
      selectorGroupSettings.value = { ...newData.selectorGroupSettings };
    }
    
    selectorsList.value.forEach((selector, index) => {
      if (selector.isFavorite === undefined) {
        selector.isFavorite = index === 0;
      }
      if (selector.sourceType === undefined) {
        selector.sourceType = 'dataset';
      }
      if (selector.datasetUrl === undefined) {
        selector.datasetUrl = '';
      }
      if (selector.selectedDatasetId === undefined) {
        selector.selectedDatasetId = null;
      }
      if (selector.selectedField === undefined) {
        selector.selectedField = '';
      }
    });
    
    const hasFavorite = selectorsList.value.some(selector => selector.isFavorite);
    if (!hasFavorite && selectorsList.value.length > 0) {
      selectorsList.value[0].isFavorite = true;
    }
    
    if (currentSelector.value.selectedDatasetId) {
      loadAvailableFields();
    }
  }
}, { immediate: true });

watch(() => currentSelector.value, (newSelector) => {
  if (newSelector) {
    urlValidationResult.value = null;
    isUrlValidating.value = false;
    
    if (newSelector.sourceType === 'dataset') {
      sourceInputValue.value = newSelector.selectedDataset || '';
    } else if (newSelector.sourceType === 'url') {
      sourceInputValue.value = newSelector.datasetUrl || '';
      if (newSelector.datasetUrl && newSelector.datasetUrl.trim()) {
        validateUrl(newSelector.datasetUrl.trim());
      }
    }
    
    if (newSelector.selectedDatasetId) {
      loadAvailableFields();
    }
  }
}, { immediate: true });

watch(sourceInputValue, (newValue) => {
  if (!currentSelector.value) return;
  
  if (currentSelector.value.sourceType === 'dataset') {
    return;
  } else if (currentSelector.value.sourceType === 'url') {
    currentSelector.value.datasetUrl = newValue;
  }
});

watch(selectedFieldType, (newFieldType) => {
  if (!newFieldType || !currentSelector.value) return;
  
  const currentSelectorType = currentSelector.value.selectorType;
  const isCurrentTypeAvailable = availableSelectorTypes.value.some(type => type.value === currentSelectorType);
  
  if (!isCurrentTypeAvailable) {
    currentSelector.value.selectorType = 'list';
    currentSelector.value.multipleSelection = false;
  }
  
  const currentOperation = currentSelector.value.operation;
  if (currentOperation) {
    const isCurrentOperationAvailable = availableOperations.value.some(
      op => op.value === currentOperation
    );
    
    if (!isCurrentOperationAvailable) {
      currentSelector.value.operation = '';
    }
  }
});

function onCancel() {
  if (originalData.value) {
    const restoredData = { ...originalData.value };
    if (originalData.value.selectorGroupSettings) {
      restoredData.selectorGroupSettings = { ...originalData.value.selectorGroupSettings };
    }
    emit('save', restoredData);
  }
  emit('close');
}

function onSubmit() {
  const settings = {
    ...props.data,
    selectorsList: selectorsList.value,
    activeSelectorIndex: activeSelectorIndex.value,
    selectorGroupSettings: selectorGroupSettings.value
  };
  
  emit('save', settings);
  emit('close');
}
</script>

<style scoped lang="scss">
.widget-settings {
  display: flex;
  border-radius: 8px;
  height: 100%;
  background: var(--color-primary-background);
  overflow: visible;
}

.widget-settings-right-side {
  width: 100%;
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: visible;
}

.widget-settings-right-side-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 9px 24px;
  flex-shrink: 0;
}

.widget-settings-right-side-title {
  color: var(--color-text-primary);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--color-secondary-text);
  
  &:hover {
    color: var(--color-primary-text);
  }
}

.close-icon {
  font-size: 32px;
  font-weight: 300;
}

.widget-settings-right-side-content{
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex: 1;
  padding: 3px 24px 0 24px;
  min-height: 0;
}

.widget-settings-right-side-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 24px 24px 24px;
  background: var(--color-primary-background);
  flex-shrink: 0;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
}

.validation-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
  border-radius: 4px;
  color: #ef4444;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
  
  &.clickable {
    cursor: pointer;
    
    &:hover {
      background-color: rgba(239, 68, 68, 0.15);
      border-color: #dc2626;
      transform: translateY(-1px);
    }
  }
}

.validation-hint .hint-icon {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
}

.validation-hint .hint-text {
  flex: 1;
}

.validation-hint .hint-action {
  font-size: 11px;
  opacity: 0.8;
  font-style: italic;
  margin-left: 8px;
}

button.cancel {
  background: none;
  color: var(--color-secondary-text);
  border: none;
  font-size: 16px;
  cursor: pointer;
}

button.cancel:hover {
  color: var(--color-primary-text);
  transition: background 0.2s, color 0.2s, opacity 0.2s;
  cursor: pointer;
}

.btn.btn-primary {
  border: none;
  border-radius: 6px;
  padding: 8px 24px;
  font-size: 16px;
  cursor: pointer;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: var(--color-border);
    color: var(--color-text-secondary);
  }
}

.dataset-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.dataset-modal-container {
  background: var(--color-primary-background);
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  max-width: 450px;
  width: 90vw;
  max-height: 600px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dataset-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px 24px;
  flex-shrink: 0;
}

.dataset-modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-primary-text);
  margin: 0;
}

.dataset-modal-close {
  background: none;
  border: none;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--color-secondary-text);
  border-radius: 6px;
  
  &:hover {
    color: var(--color-primary-text);
    background: var(--color-hover-background);
  }
  
  .close-icon {
    font-size: 24px;
    font-weight: 300;
  }
}

.dataset-modal-content {
  padding: 0px 24px 24px 24px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}


</style>