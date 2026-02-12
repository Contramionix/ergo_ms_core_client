<template>
  <div v-if="visible" class="modal-backdrop fade show" @click="close"></div>
  <ModalCenter v-if="visible" modal-id="chartSettingsFilterModal" :title="field?.name ?? ''" :custom-class="'show d-block'" :dialog-class="'modal-lg'" @closemodal="close">
    <div class="chart-settings-filter-content">
      <div class="filter-modal-operation">
        <label class="filter-modal-label">Операция</label>
        <select v-model="operation" class="form-select form-select-sm">
          <option v-for="opt in availableOperations" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <template v-if="isDateField && isDateRangeOp">
        <div class="filter-modal-date-range">
          <div class="filter-modal-date-preset-row">
            <div class="filter-modal-date-preset-select">
              <label class="filter-modal-label">Пресет</label>
              <div class="d-flex align-items-center gap-2 flex-wrap">
                <select v-model="datePreset" class="form-select form-select-sm w-auto">
                  <option v-for="opt in DATE_PRESET_OPTIONS" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
                <div class="form-check form-check-inline">
                  <input id="include-today-checkbox" v-model="includeToday" class="form-check-input" type="checkbox">
                  <label class="form-check-label" for="include-today-checkbox">Включая текущий день</label>
                </div>
              </div>
            </div>
          </div>

          <div class="filter-modal-date-range-panels row g-3">
            <div class="col-12 col-md-6">
              <div class="filter-modal-date-panel">
                <div class="filter-modal-date-panel-header">Начало</div>
                <div class="filter-modal-date-mode">
                  <div class="form-check form-check-inline">
                    <input id="start-mode-exact" v-model="startMode" class="form-check-input" type="radio" value="exact">
                    <label class="form-check-label" for="start-mode-exact">Точная дата</label>
                  </div>
                  <div class="form-check form-check-inline">
                    <input id="start-mode-offset" v-model="startMode" class="form-check-input" type="radio" value="offset">
                    <label class="form-check-label" for="start-mode-offset">Смещение от текущей даты</label>
                  </div>
                </div>
                <div v-if="startMode === 'exact'" class="filter-modal-date-input-row">
                  <input
                    v-model="startExact"
                    :type="dateFieldType === 'date&time' ? 'datetime-local' : 'date'"
                    class="form-control form-control-sm"
                  >
                  <div v-if="startPreviewText" class="filter-modal-date-preview">
                    = {{ startPreviewText }}
                  </div>
                </div>
                <div v-else class="filter-modal-date-offset-row">
                  <div class="input-group input-group-sm">
                    <select v-model="startOffset.sign" class="form-select form-select-sm w-auto">
                      <option value="minus">Минус</option>
                      <option value="plus">Плюс</option>
                    </select>
                    <input
                      v-model.number="startOffset.amount"
                      type="number"
                      min="0"
                      class="form-control form-control-sm"
                    >
                    <select v-model="startOffset.unit" class="form-select form-select-sm w-auto">
                      <option v-for="u in DATE_OFFSET_UNITS" :key="u.value" :value="u.value">
                        {{ u.label }}
                      </option>
                    </select>
                  </div>
                  <div v-if="startPreviewText" class="filter-modal-date-preview">
                    = {{ startPreviewText }}
                  </div>
                </div>
              </div>
            </div>

            <div class="col-12 col-md-6">
              <div class="filter-modal-date-panel">
                <div class="filter-modal-date-panel-header">Конец</div>
                <div class="filter-modal-date-mode">
                  <div class="form-check form-check-inline">
                    <input id="end-mode-exact" v-model="endMode" class="form-check-input" type="radio" value="exact">
                    <label class="form-check-label" for="end-mode-exact">Точная дата</label>
                  </div>
                  <div class="form-check form-check-inline">
                    <input id="end-mode-offset" v-model="endMode" class="form-check-input" type="radio" value="offset">
                    <label class="form-check-label" for="end-mode-offset">Смещение от текущей даты</label>
                  </div>
                </div>
                <div v-if="endMode === 'exact'" class="filter-modal-date-input-row">
                  <input
                    v-model="endExact"
                    :type="dateFieldType === 'date&time' ? 'datetime-local' : 'date'"
                    class="form-control form-control-sm"
                  >
                  <div v-if="endPreviewText" class="filter-modal-date-preview">
                    = {{ endPreviewText }}
                  </div>
                </div>
                <div v-else class="filter-modal-date-offset-row">
                  <div class="input-group input-group-sm">
                    <select v-model="endOffset.sign" class="form-select form-select-sm w-auto">
                      <option value="minus">Минус</option>
                      <option value="plus">Плюс</option>
                    </select>
                    <input
                      v-model.number="endOffset.amount"
                      type="number"
                      min="0"
                      class="form-control form-control-sm"
                    >
                    <select v-model="endOffset.unit" class="form-select form-select-sm w-auto">
                      <option v-for="u in DATE_OFFSET_UNITS" :key="u.value" :value="u.value">
                        {{ u.label }}
                      </option>
                    </select>
                  </div>
                  <div v-if="endPreviewText" class="filter-modal-date-preview">
                    = {{ endPreviewText }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="isSetOp">
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

      <div v-else-if="isDateSingleOp" class="filter-modal-single">
        <label class="filter-modal-label">Значение</label>
        <div class="filter-modal-date-single">
          <div class="filter-modal-date-mode">
            <div class="form-check form-check-inline">
              <input id="single-date-mode-exact" v-model="singleDateMode" class="form-check-input" type="radio" value="exact">
              <label class="form-check-label" for="single-date-mode-exact">Точная дата</label>
            </div>
            <div class="form-check form-check-inline">
              <input id="single-date-mode-offset" v-model="singleDateMode" class="form-check-input" type="radio" value="offset">
              <label class="form-check-label" for="single-date-mode-offset">Смещение от текущей даты</label>
            </div>
          </div>

          <div v-if="singleDateMode === 'exact'" class="filter-modal-date-input-row">
            <input
              v-model="singleDateExact"
              :type="dateFieldType === 'date&time' ? 'datetime-local' : 'date'"
              class="form-control form-control-sm"
            >
            <div v-if="singleDatePreviewText" class="filter-modal-date-preview">
              = {{ singleDatePreviewText }}
            </div>
          </div>
          <div v-else class="filter-modal-date-offset-row">
            <div class="input-group input-group-sm">
              <select v-model="singleDateOffset.sign" class="form-select form-select-sm w-auto">
                <option value="minus">Минус</option>
                <option value="plus">Плюс</option>
              </select>
              <input
                v-model.number="singleDateOffset.amount"
                type="number"
                min="0"
                class="form-control form-control-sm"
              >
              <select v-model="singleDateOffset.unit" class="form-select form-select-sm w-auto">
                <option v-for="u in DATE_OFFSET_UNITS" :key="u.value" :value="u.value">
                  {{ u.label }}
                </option>
              </select>
            </div>
            <div v-if="singleDatePreviewText" class="filter-modal-date-preview">
              = {{ singleDatePreviewText }}
            </div>
          </div>
        </div>
      </div>

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
import { ref, computed, watch, reactive } from 'vue'
import ModalCenter from '@/components/ModalCenter.vue'
import SpinnerLoading from '@/components/SpinnerLoading.vue'
import chartService from '@/core/bi/MainPage/Sidebar/components/js/chartService.js'
import {
  buildRangeFromPreset,
  formatDateForField,
  formatDateForInput,
  formatDisplayDate,
  getToday,
  applyOffset,
  parseInputDate,
} from '@/core/bi/Charts/components/js/chartDateFilterUtils.js'

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

const DATE_OPERATIONS = [
  { value: 'date_range', label: 'Принадлежит диапазону' },
  { value: 'eq', label: 'Равно' },
  { value: 'neq', label: 'Не равно' },
  { value: 'gt', label: 'Больше' },
  { value: 'lt', label: 'Меньше' },
  { value: 'gte', label: 'Больше или равно' },
  { value: 'lte', label: 'Меньше или равно' },
  { value: 'empty', label: 'Пусто' },
  { value: 'nempty', label: 'Не пусто' },
  { value: 'in', label: 'Принадлежит множеству' },
  { value: 'nin', label: 'Не принадлежит множеству' },
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

const isDateField = computed(() => {
  const type = props.field?.type
  return type === 'date' || type === 'date&time'
})

const availableOperations = computed(() => (isDateField.value ? DATE_OPERATIONS : OPERATIONS))

const isDateRangeOp = computed(() => isDateField.value && operation.value === 'date_range')
const isSetOp = computed(() => operation.value === 'in' || operation.value === 'nin')
const isEmptyOp = computed(() => operation.value === 'empty' || operation.value === 'nempty')
const isDateSingleOp = computed(() => isDateField.value && !isSetOp.value && !isEmptyOp.value && !isDateRangeOp.value)
const isSingleValueOp = computed(() => !isSetOp.value && !isEmptyOp.value && !isDateRangeOp.value && !isDateSingleOp.value)

// Состояние для работы с датами
const datePreset = ref('today')
const includeToday = ref(true)

const startMode = ref('exact') // exact | offset
const endMode = ref('exact')

const startExact = ref('')
const endExact = ref('')

const startOffset = reactive({
  sign: 'minus',
  amount: 1,
  unit: 'days',
})

const endOffset = reactive({
  sign: 'plus',
  amount: 0,
  unit: 'days',
})

const singleDateMode = ref('exact')
const singleDateExact = ref('')
const singleDateOffset = reactive({
  sign: 'plus',
  amount: 0,
  unit: 'days',
})

const DATE_PRESET_OPTIONS = [
  { value: 'today', label: 'Сегодня' },
  { value: 'yesterday', label: 'Вчера' },
  { value: 'last_3_days', label: 'Последние 3 дня' },
  { value: 'last_7_days', label: 'Последние 7 дней' },
  { value: 'last_14_days', label: 'Последние 14 дней' },
  { value: 'last_28_days', label: 'Последние 28 дней' },
  { value: 'last_90_days', label: 'Последние 90 дней' },
  { value: 'last_180_days', label: 'Последние 180 дней' },
  { value: 'last_365_days', label: 'Последние 365 дней' },
]

const DATE_OFFSET_UNITS = [
  { value: 'years', label: 'Лет' },
  { value: 'quarters', label: 'Кварталов' },
  { value: 'months', label: 'Месяцев' },
  { value: 'weeks', label: 'Недель' },
  { value: 'days', label: 'Дней' },
]

const dateFieldType = computed(() => (props.field?.type === 'date&time' ? 'date&time' : 'date'))

function computeDateFromConfig(mode, exactValue, offsetConfig, isEnd) {
  const type = dateFieldType.value
  if (mode === 'exact') {
    return parseInputDate(exactValue, type, isEnd)
  }
  const base = getToday()
  const shifted = applyOffset(base, offsetConfig)
  if (!shifted) return null
  return shifted
}

const startDateEffective = computed(() =>
  isDateField.value && isDateRangeOp.value
    ? computeDateFromConfig(startMode.value, startExact.value, startOffset, false)
    : null
)

const endDateEffective = computed(() =>
  isDateField.value && isDateRangeOp.value
    ? computeDateFromConfig(endMode.value, endExact.value, endOffset, true)
    : null
)

const singleDateEffective = computed(() =>
  isDateField.value && isDateSingleOp.value
    ? computeDateFromConfig(singleDateMode.value, singleDateExact.value, singleDateOffset, false)
    : null
)

const startPreviewText = computed(() =>
  startDateEffective.value ? formatDisplayDate(startDateEffective.value, dateFieldType.value) : ''
)

const endPreviewText = computed(() =>
  endDateEffective.value ? formatDisplayDate(endDateEffective.value, dateFieldType.value) : ''
)

const singleDatePreviewText = computed(() =>
  singleDateEffective.value ? formatDisplayDate(singleDateEffective.value, dateFieldType.value) : ''
)

function resetDateState() {
  datePreset.value = 'today'
  includeToday.value = true

  startMode.value = 'exact'
  endMode.value = 'exact'
  startExact.value = ''
  endExact.value = ''

  startOffset.sign = 'minus'
  startOffset.amount = 1
  startOffset.unit = 'days'

  endOffset.sign = 'plus'
  endOffset.amount = 0
  endOffset.unit = 'days'

  singleDateMode.value = 'exact'
  singleDateExact.value = ''
  singleDateOffset.sign = 'plus'
  singleDateOffset.amount = 0
  singleDateOffset.unit = 'days'
}

const filteredAvailable = computed(() => availableValues.value)
const canApplyFilter = computed(() => {
  if (isEmptyOp.value) return true
  if (isSetOp.value) return selectedValues.value.length > 0
  if (isDateRangeOp.value) {
    return Boolean(startDateEffective.value || endDateEffective.value)
  }
  if (isDateSingleOp.value) {
    return Boolean(singleDateEffective.value)
  }
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
  const initial = props.initialFilter
  const isDate = isDateField.value
  const op = initial?.op ?? (isDate ? 'date_range' : 'in')
  operation.value = op

  if (isDate && op === 'date_range') {
    const val = initial?.value || {}
    datePreset.value = val.preset || 'today'
    includeToday.value = val.includeToday !== false

    const type = dateFieldType.value
    const start = val.start ? parseInputDate(val.start, type, false) : null
    const end = val.end ? parseInputDate(val.end, type, true) : null

    if (start) {
      startMode.value = 'exact'
      startExact.value = formatDateForInput(start, type, false)
    } else {
      startMode.value = 'exact'
      startExact.value = ''
    }

    if (end) {
      endMode.value = 'exact'
      endExact.value = formatDateForInput(end, type, true)
    } else {
      endMode.value = 'exact'
      endExact.value = ''
    }

    selectedValues.value = []
    singleValue.value = ''
    singleDateExact.value = ''
  } else if (isDate && !isSetOp.value && !isEmptyOp.value && op !== 'date_range') {
    const type = dateFieldType.value
    const rawVal = initial?.value
    const parsed = typeof rawVal === 'string' ? parseInputDate(rawVal, type, false) : null
    operation.value = op
    singleDateMode.value = 'exact'
    singleDateExact.value = parsed ? formatDateForInput(parsed, type, false) : ''
    selectedValues.value = []
    singleValue.value = ''
  } else if (op === 'in' || op === 'nin') {
    const valueList = initial?.value ?? []
    selectedValues.value = Array.isArray(valueList) ? [...valueList] : []
    singleValue.value = ''
  } else if (op === 'empty' || op === 'nempty') {
    selectedValues.value = []
    singleValue.value = ''
  } else {
    const val = initial?.value
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
      resetDateState()
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
    singleDateExact.value = ''
  } else if (isDateField.value && newOp === 'date_range') {
    // При переключении на диапазон инициализируем от пресета
    const { start, end } = buildRangeFromPreset(datePreset.value, includeToday.value)
    startMode.value = 'exact'
    endMode.value = 'exact'
    startExact.value = start ? formatDateForInput(start, dateFieldType.value, false) : ''
    endExact.value = end ? formatDateForInput(end, dateFieldType.value, true) : ''
    selectedValues.value = []
    singleValue.value = ''
    singleDateExact.value = ''
  } else if (isDateField.value && !isSetOp.value && !isEmptyOp.value) {
    // Одиночная дата
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

watch(
  () => [datePreset.value, includeToday.value],
  () => {
    if (!isDateField.value || !isDateRangeOp.value || !datePreset.value) return
    const { start, end } = buildRangeFromPreset(datePreset.value, includeToday.value)
    startMode.value = 'exact'
    endMode.value = 'exact'
    startExact.value = start ? formatDateForInput(start, dateFieldType.value, false) : ''
    endExact.value = end ? formatDateForInput(end, dateFieldType.value, true) : ''
  }
)

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
  const type = dateFieldType.value

  if (isDateField.value && op === 'date_range') {
    const start = startDateEffective.value
    const end = endDateEffective.value
    value = {
      type,
      preset: datePreset.value || null,
      includeToday: includeToday.value,
      start: start ? formatDateForField(start, type) : null,
      end: end ? formatDateForField(end, type) : null,
    }
  } else if (isDateField.value && isDateSingleOp.value) {
    const dateVal = singleDateEffective.value
    value = dateVal ? formatDateForField(singleDateEffective.value, type) : null
  } else if (op === 'in' || op === 'nin') {
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

.filter-modal-date-range {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-modal-date-preset-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-modal-date-range-panels {
  margin-top: 4px;
}

.filter-modal-date-panel {
  border: 1px solid var(--color-secondary-background);
  border-radius: 6px;
  padding: 10px;
  background: var(--color-secondary-background);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-modal-date-panel-header {
  font-size: 0.875rem;
  font-weight: 500;
}

.filter-modal-date-mode {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
}

.filter-modal-date-input-row,
.filter-modal-date-offset-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-modal-date-preview {
  font-size: 0.8125rem;
  color: var(--color-secondary-text);
}

.filter-modal-date-single {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  border-radius: 6px;

  &:hover:not(:disabled) {
    background-color: #f0f0f0;
  }
}

.btn-accept {
  background-color: #0b5ed7;
  color: white;
  border-radius: 6px;

  &:hover:not(:disabled) {
    background-color: #0a4b9a;
  }
}
</style>
