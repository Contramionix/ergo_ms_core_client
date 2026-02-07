<template>
  <div v-if="visible" class="modal-backdrop fade show" @click="close"></div>
  <ModalCenter v-if="visible" modal-id="chartSettingsFilterModal" :title="field?.name ?? ''" :custom-class="'show d-block'" :dialog-class="'modal-lg'" @closemodal="close">
    <div class="chart-settings-filter-content">
      <div class="filter-modal-operation">
        <label class="filter-modal-label">Операция</label>
        <select v-model="operation" class="form-select form-select-sm">
          <option v-for="opt in OPERATIONS" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <template v-if="isSetOp">
        <div class="filter-modal-panels">
          <div class="filter-modal-panel">
            <div class="filter-modal-panel-header">
              <span>Доступны</span>
              <button type="button" class="btn btn-sm btn-link p-0" @click="selectAllAvailable">Выбрать все</button>
            </div>
            <input v-model="searchAvailable" type="text" class="form-control form-control-sm" placeholder="Найти"/>
            <div class="filter-modal-list-wrap">
              <div v-if="loading" class="filter-modal-list-spinner">
                <SpinnerLoading loading-text="Загрузка…" />
              </div>
              <ul v-else class="filter-modal-list">
                <li v-for="v in filteredAvailable" :key="v" class="filter-modal-list-item" @click="addToSelected(v)">{{ v }}</li>
                <li v-if="!filteredAvailable.length" class="filter-modal-list-empty"><i>Ничего не найдено</i></li>
              </ul>
            </div>
          </div>
          <div class="filter-modal-panel">
            <div class="filter-modal-panel-header">
              <span>Выбраны</span>
              <button type="button" class="btn btn-sm btn-link p-0" @click="clearSelected">Очистить</button>
            </div>
            <input v-model="searchSelected" type="text" class="form-control form-control-sm" placeholder="Найти"/>
            <div class="filter-modal-list-wrap">
              <div v-if="loading" class="filter-modal-list-spinner">
                <SpinnerLoading loading-text="Загрузка…" />
              </div>
              <ul v-else class="filter-modal-list">
                <li v-for="v in filteredSelected" :key="v" class="filter-modal-list-item" @click="removeFromSelected(v)">{{ v }}</li>
                <li v-if="!filteredSelected.length" class="filter-modal-list-empty"><i>Пусто</i></li>
              </ul>
            </div>
          </div>
        </div>
        <p class="filter-modal-hint">Показана первая 1000 значений. Уточните поиск с помощью поля Найти.</p>
      </template>

      <div v-else-if="isSingleValueOp" class="filter-modal-single">
        <label class="filter-modal-label">Значение</label>
        <input v-model="singleValue" type="text" class="form-control form-control-sm" placeholder="Введите значение"/>
      </div>

      <div class="modal-actions-buttons">
        <button type="button" class="btn btn-cancel" @click="close">Отмена</button>
        <button type="button" class="btn btn-accept" :disabled="!canApplyFilter" @click="apply">Применить фильтр</button>
      </div>
    </div>
  </ModalCenter>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import ModalCenter from '@/components/ModalCenter.vue'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import chartService from '@/core/bi/MainPage/Sidebar/components/js/chartService.js'

const DEBOUNCE_MS = 350

const props = defineProps({
  visible: { type: Boolean, default: false },
  field: { type: Object, default: null },
  datasetId: { type: Number, default: null },
  initialFilter: { type: Object, default: null },
})

const emit = defineEmits(['update:visible', 'apply'])

const OPERATIONS = [
  { value: 'in', label: 'Принадлежит множеству' },
  { value: 'nin', label: 'Не принадлежит множеству' },
  { value: 'eq', label: 'Равно' },
  { value: 'neq', label: 'Не равно' },
  { value: 'startswith_i', label: 'Начинается на (без учета регистра)' },
  { value: 'startswith', label: 'Начинается на (с учетом регистра)' },
  { value: 'endswith_i', label: 'Заканчивается на (без учета регистра)' },
  { value: 'endswith', label: 'Заканчивается на (с учетом регистра)' },
  { value: 'contains_i', label: 'Содержит (без учета регистра)' },
  { value: 'contains', label: 'Содержит (с учетом регистра)' },
  { value: 'ncontains_i', label: 'Не содержит (без учета регистра)' },
  { value: 'ncontains', label: 'Не содержит (с учетом регистра)' },
  { value: 'empty', label: 'Пусто' },
  { value: 'nempty', label: 'Не пусто' },
  { value: 'gt', label: 'Больше' },
  { value: 'lt', label: 'Меньше' },
  { value: 'gte', label: 'Больше или равно' },
  { value: 'lte', label: 'Меньше или равно' },
]

const operation = ref('in')
const singleValue = ref('')
const initialAvailableValues = ref([])
const availableValues = ref([])
const selectedValues = ref([])
const searchAvailable = ref('')
const searchSelected = ref('')
const loading = ref(false)
let searchDebounceTimer = null

const isSetOp = computed(() => operation.value === 'in' || operation.value === 'nin')
const isEmptyOp = computed(() => operation.value === 'empty' || operation.value === 'nempty')
const isSingleValueOp = computed(() => !isSetOp.value && !isEmptyOp.value)

const filteredAvailable = computed(() => availableValues.value)
const canApplyFilter = computed(() => {
  if (isEmptyOp.value) return true
  if (isSetOp.value) return selectedValues.value.length > 0
  return String(singleValue.value ?? '').trim() !== ''
})
const filteredSelected = computed(() => {
  const list = selectedValues.value
  const q = searchSelected.value.trim().toLowerCase()
  if (!q) return list
  return list.filter((v) => String(v).toLowerCase().includes(q))
})

async function loadInitialFieldValues() {
  if (!props.field?.id || !props.datasetId) return
  loading.value = true
  initialAvailableValues.value = []
  availableValues.value = []
  try {
    const { data } = await chartService.getFieldValues(props.datasetId, props.field.id)
    const values = data?.values ?? []
    initialAvailableValues.value = [...values]
    availableValues.value = [...values]
  } catch {
    initialAvailableValues.value = []
    availableValues.value = []
  } finally {
    loading.value = false
  }
}

function onSearchAvailableDebounced() {
  const q = searchAvailable.value.trim()
  if (q === '') {
    availableValues.value = [...initialAvailableValues.value]
    return
  }
  loading.value = true
  chartService
    .getFieldValues(props.datasetId, props.field.id, q)
    .then(({ data }) => {
      availableValues.value = data?.values ?? []
    })
    .catch(() => {
      availableValues.value = []
    })
    .finally(() => {
      loading.value = false
    })
}

function initFromInitialFilter() {
  const op = props.initialFilter?.op ?? 'in'
  operation.value = op
  if (op === 'in' || op === 'nin') {
    const initial = props.initialFilter?.value ?? []
    selectedValues.value = Array.isArray(initial) ? [...initial] : []
    singleValue.value = ''
  } else if (op === 'empty' || op === 'nempty') {
    selectedValues.value = []
    singleValue.value = ''
  } else {
    const val = props.initialFilter?.value
    singleValue.value = val == null ? '' : (Array.isArray(val) ? (val[0] ?? '') : String(val))
    selectedValues.value = []
  }
}

watch(
  () => [props.visible, props.field?.id, props.datasetId],
  ([visible, fieldId, datasetId]) => {
    if (visible && fieldId && datasetId) {
      searchAvailable.value = ''
      searchSelected.value = ''
      initFromInitialFilter()
      if (operation.value === 'in' || operation.value === 'nin') {
        loadInitialFieldValues()
      }
    }
  },
  { immediate: true }
)

watch(operation, (newOp, oldOp) => {
  if (newOp === 'in' || newOp === 'nin') {
    if (oldOp !== 'in' && oldOp !== 'nin' && props.field?.id && props.datasetId) {
      loadInitialFieldValues()
    }
  } else if (newOp === 'empty' || newOp === 'nempty') {
    selectedValues.value = []
    singleValue.value = ''
  } else {
    if (oldOp === 'in' || oldOp === 'nin') {
      singleValue.value = selectedValues.value[0] != null ? String(selectedValues.value[0]) : ''
    }
    selectedValues.value = []
  }
})

watch(searchAvailable, () => {
  if (!isSetOp.value || !props.field?.id || !props.datasetId) return
  if (searchDebounceTimer != null) {
    clearTimeout(searchDebounceTimer)
  }
  searchDebounceTimer = setTimeout(() => {
    searchDebounceTimer = null
    onSearchAvailableDebounced()
  }, DEBOUNCE_MS)
})

function addToSelected(value) {
  if (!selectedValues.value.includes(value)) {
    selectedValues.value = [...selectedValues.value, value]
  }
}

function removeFromSelected(value) {
  selectedValues.value = selectedValues.value.filter((v) => v !== value)
}

function selectAllAvailable() {
  const toAdd = filteredAvailable.value.filter((v) => !selectedValues.value.includes(v))
  selectedValues.value = [...selectedValues.value, ...toAdd]
}

function clearSelected() {
  selectedValues.value = []
}

function close() {
  emit('update:visible', false)
}

function apply() {
  if (!props.field) {
    emit('update:visible', false)
    return
  }
  const op = operation.value
  let value
  if (op === 'in' || op === 'nin') {
    value = [...selectedValues.value]
  } else if (op === 'empty' || op === 'nempty') {
    value = null
  } else {
    value = singleValue.value
  }
  emit('apply', { field: props.field, filter: { op, value } })
  emit('update:visible', false)
}
</script>

<style lang="scss" scoped>
.chart-settings-filter-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-modal-operation {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: nowrap;

  .filter-modal-label {
    margin-bottom: 0;
    flex-shrink: 0;
  }

  .form-select {
    flex: 1;
    min-width: 0;
  }
}

.filter-modal-label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.875rem;
  color: var(--color-secondary-text);
}

.filter-modal-panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  min-height: 240px;
}

.filter-modal-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid var(--color-secondary-background);
  border-radius: 6px;
  padding: 10px;
  background: var(--color-secondary-background);
  max-height: 320px;
  min-height: 0;
}

.filter-modal-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.875rem;
  font-weight: 500;
}

.filter-modal-panel-header .btn-link {
  font-size: 0.8125rem;
  text-decoration: none;
  color: var(--color-accent);
}

.filter-modal-panel-header .btn-link:hover {
  text-decoration: underline;
}

.filter-modal-list-wrap {
  flex: 1;
  min-height: 120px;
  border-radius: 4px;
  background: var(--color-primary-background);
  display: flex;
  flex-direction: column;
}

.filter-modal-list-spinner {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-modal-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
  min-height: 120px;
  border-radius: 4px;
  background: var(--color-primary-background);
}

.filter-modal-list-item {
  padding: 6px 10px;
  font-size: 0.875rem;
  cursor: pointer;
  border-radius: 4px;
}

.filter-modal-list-item:hover {
  background: var(--color-hover-background);
}

.filter-modal-list-empty {
  padding: 12px;
  font-size: 0.875rem;
  color: var(--color-secondary-text);
  font-style: italic;
}

.filter-modal-hint {
  margin: 12px 0 0;
  font-size: 0.8125rem;
  color: var(--color-secondary-text);
}

.filter-modal-single {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.modal-actions-buttons {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
  padding-top: 12px;
  border-top: 1px solid var(--color-secondary-background);
  justify-content: flex-end;
}

.btn-cancel {
  background-color: var(--color-primary-background);
  color: var(--color-primary-text);

  &:hover:not(:disabled) {
    background-color: #f0f0f0;
  }
}

.btn-accept {
  background-color: #0b5ed7;
  color: white;

  &:hover:not(:disabled) {
    background-color: #0a4b9a;
  }
}
</style>
