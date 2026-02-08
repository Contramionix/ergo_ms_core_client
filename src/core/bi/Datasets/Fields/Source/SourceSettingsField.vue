<template>
    <div class="field-body">
        <div class="body-table">
            <div class="table-row">
                <div class="table-row-label">Источник</div>
                <div class="dropdown-wrapper select-2">
                    <button type="button" class="dropdown-toggle form-select form-select-sm table-row-select w-100" @click="onToggleMenu('table', $event)">
                        {{ selectedTableLabel }}
                    </button>
                    <div v-if="isTableOpen" class="dropdown-menu show floating" :style="dropdownStyle">
                        <div class="dropdown-search p-2">
                            <input type="text" class="form-control form-control-sm" placeholder="Поиск таблицы..." v-model="tableFilter" autocomplete="off"/>
                        </div>
                        <ul class="dropdown-list">
                            <li v-for="t in filteredTables" :key="t.id" class="dropdown-item" :class="{ active: isSelectedTable(t) }" @click="selectTable(t)">
                                {{ tableLabel(t) }}
                            </li>
                            <li v-if="filteredTables.length === 0" class="dropdown-empty">Нет результатов</li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="table-row">
                <div class="table-row-label">Поле источника</div>
                <div class="dropdown-wrapper select-2">
                    <button type="button" class="dropdown-toggle form-select form-select-sm table-row-select w-100" :disabled="!selectedTable" @click="onToggleMenu('column', $event)">
                        {{ selectedColumnLabel }}
                    </button>
                    <div v-if="isColumnOpen" class="dropdown-menu show floating" :style="dropdownStyle">
                        <div class="dropdown-search p-2">
                            <input type="text" class="form-control form-control-sm" placeholder="Поиск по полям..." v-model="columnFilter" autocomplete="off"/>
                        </div>
                        <ul class="dropdown-list">
                            <li v-for="col in filteredColumns" :key="col" class="dropdown-item" :class="{ active: isSelectedColumn(col) }" @click="selectColumn(col)">
                                {{ col }}
                            </li>
                            <li v-if="filteredColumns.length === 0" class="dropdown-empty">Нет результатов</li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="table-row">
                <div class="table-row-label">Тип поля</div>
                <div class="dropdown-wrapper select-2 type-select-wrap">
                    <SelectBox :modelValue="selectedType" @update:modelValue="val => selectedType = val" :options="typeOptionsAvailable" value-key="value" label-key="label" :include-all-option="false" all-label="Выберите тип" size="sm">
                        <template #selected="{ option, label }">
                            <span class="d-flex align-items-center gap-2 flex-grow-1 min-w-0">
                                <span class="d-flex align-items-center flex-shrink-0" :style="{ color: getTypeColor(option?.value) }">
                                    <component :is="typeIcon[option?.value] || typeIcon.string" :size="16" />
                                </span>
                                <span class="text-truncate">{{ label }}</span>
                            </span>
                        </template>
                        <template #option="{ value, label }">
                            <span class="d-flex align-items-center gap-2">
                                <span class="d-flex align-items-center flex-shrink-0" :style="{ color: getTypeColor(value) }">
                                    <component :is="typeIcon[value] || typeIcon.string" :size="16" />
                                </span>
                                {{ label }}
                            </span>
                        </template>
                    </SelectBox>
                </div>
            </div>
            <div class="table-row">
                <div class="table-row-label">Агрегация</div>
                <div class="dropdown-wrapper select-2 type-select-wrap">
                    <SelectBox :modelValue="selectedAggregation" @update:modelValue="val => selectedAggregation = val" :options="aggregationOptionsWithNone" value-key="value" label-key="label" :include-all-option="false" all-label="Нет" size="sm" :disabled="!selectedType"/>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import SelectBox from '@/components/SelectBox.vue'
import { fetchTableColumns } from './js/tableColumnsService'
import { getTypeOptionsForField, getAggregationOptions } from '@/core/bi/Datasets/Fields/Source/js/DatasetPreviewFieldOptions.js'
import { typeIcon, getTypeColor } from '../js/fieldTypeDisplay.js'

const props = defineProps({
    tables: { type: Array, default: () => [] },
    selectedConnection: { type: Object, default: null },
    field: { type: Object, default: null }
})

defineEmits(['update:search', 'insert-field'])

const isTableOpen = ref(false)
const tableFilter = ref('')
const selectedTable = ref(null)
const isColumnOpen = ref(false)
const columnFilter = ref('')
const columns = ref([])
const selectedColumn = ref('')
const selectedType = ref('')
const selectedAggregation = ref('')
const menuPosition = ref({ top: 0, left: 0, width: 0 })

function computeMenuPosition(evt) {
    const target = evt?.currentTarget || evt?.target
    if (!target || typeof target.getBoundingClientRect !== 'function') return
    const rect = target.getBoundingClientRect()
    menuPosition.value = {
        top: Math.round(rect.bottom + 6),
        left: Math.round(rect.left),
        width: Math.round(rect.width)
    }
}

function onToggleMenu(kind, evt) {
    const nextState = { table: false, column: false }
    computeMenuPosition(evt)
    if (kind === 'table') nextState.table = !isTableOpen.value
    if (kind === 'column') nextState.column = !isColumnOpen.value
    isTableOpen.value = nextState.table
    isColumnOpen.value = nextState.column
}

const dropdownStyle = computed(() => ({
    position: 'fixed',
    top: `${menuPosition.value.top}px`,
    left: `${menuPosition.value.left}px`,
    width: `${menuPosition.value.width}px`,
    maxWidth: 'calc(100vw - 24px)'
}))

const connectionName = computed(() => props.selectedConnection?.name || 'Подключение')

const isEditing = computed(() => !!props.field)

function tableLabel(t) {
    return t.name || ((t.schema && t.table) ? `${t.schema}.${t.table}` : (t.table || ''))
}

const filteredTables = computed(() => {
    const s = tableFilter.value.trim().toLowerCase()
    if (!s) return props.tables
    return props.tables.filter(t => {
        const lbl = tableLabel(t).toLowerCase()
        return lbl.includes(s)
    })
})

const selectedTableLabel = computed(() => {
    if (!selectedTable.value) {
        return isEditing.value ? `${connectionName.value}.Выберите таблицу` : 'Выберите таблицу'
    }
    return `${connectionName.value}.${tableLabel(selectedTable.value)}`
})

const selectedColumnLabel = computed(() => {
    if (!selectedTable.value) return 'Сначала выберите таблицу'
    if (!selectedColumn.value) return 'Выберите поле'
    return selectedColumn.value
})

const filteredColumns = computed(() => {
    const s = columnFilter.value.trim().toLowerCase()
    if (!s) return columns.value || []
    return (columns.value || []).filter(col => String(col).toLowerCase().includes(s))
})

async function selectTable(t) {
    selectedTable.value = t
    isTableOpen.value = false
    selectedColumn.value = ''
    columns.value = await fetchTableColumns(t)
}

function isSelectedTable(t) {
    return selectedTable.value && String(selectedTable.value.id) === String(t.id)
}

function selectColumn(col) {
    selectedColumn.value = col
    isColumnOpen.value = false
}

function isSelectedColumn(col) {
    return selectedColumn.value === col
}

function onClickOutside(e) {
    const root = e.target.closest('.dropdown-wrapper')
    if (!root) {
        isTableOpen.value = false
        isColumnOpen.value = false
    }
}

onMounted(() => {
    document.addEventListener('click', onClickOutside)
})

onBeforeUnmount(() => {
    document.removeEventListener('click', onClickOutside)
})

function resolveSelectedFromField() {
    if (!props.field) return
    const srcTbl = props.field.source_table
    const src = props.field.source
    const initialColumn = src && src.column ? String(src.column) : ''
    const initialType = props.field.type ? String(props.field.type) : ''
    const initialAggregation = props.field.aggregation ? String(props.field.aggregation) : ''

    let found = null
    if (srcTbl && typeof srcTbl === 'object' && srcTbl.id) {
        found = props.tables.find(t => String(t.id) === String(srcTbl.id))
    } else if (srcTbl) {
        found = props.tables.find(t => String(t.id) === String(srcTbl))
    }
    if (!found && src && src.table) {
        const target = String(src.table)
        found = props.tables.find(t => tableLabel(t) === target || t.table === target)
    }
    if (found) {
        selectedTable.value = found
        fetchTableColumns(found).then(cols => {
            columns.value = cols || []
        }).catch(() => {
            columns.value = []
        })
        if (initialColumn) {
            selectedColumn.value = initialColumn
        }
    }

    if (initialType) {
        selectedType.value = initialType
    }

    selectedAggregation.value = initialAggregation
}

const aggregationOptions = computed(() => getAggregationOptions(selectedType.value) || [])

const aggregationOptionsWithNone = computed(() => [
    { value: '', label: 'Нет' },
    ...aggregationOptions.value
])

const typeOptionsAvailable = computed(() => getTypeOptionsForField(props.field || {}))

watch(() => props.tables, resolveSelectedFromField, { deep: true })
watch(() => props.field, resolveSelectedFromField, { deep: true, immediate: true })

watch([selectedType], () => {
    const values = new Set((aggregationOptions.value || []).map(o => o.value))
    if (!values.has(selectedAggregation.value)) {
        selectedAggregation.value = ''
    }
})
</script>

<style scoped lang="scss">
.field-body{
    width: 100%;
    height: 100%;
    overflow-y: auto;
    padding: 20px 32px 0;
}

.body-table{
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.table-row{
    display: flex;
    align-items: center;
}

.table-row-label{
    flex: 0 0 150px;
    color: var(--color-primary-text);
    font-size: 0.9rem;
}

.table-row-select {
  background: transparent !important;
  color: var(--color-primary-text) !important;
  border: 1px solid var(--color-border) !important;
  border-radius: 5px !important;
  padding: 0.25rem 0.5rem !important;
  transition: background-color 0.2s ease, border-color 0.2s ease !important;
  appearance: none !important;
}

.table-row-select:hover,
.table-row-select:focus {
  background-color: var(--color-hover-background) !important;
  border-color: var(--color-border) !important;
  outline: none !important;
}

.table-row-select::-ms-expand {
  display: none !important;
}

.select-1{
    max-width: 580px;
}

.select-2{
    max-width: 260px;
}

.type-select-wrap :deep(.select-trigger) {
    min-height: 31px;
    padding: 0.25rem 0.5rem;
    background: transparent !important;
    color: var(--color-primary-text) !important;
    border: 1px solid var(--color-border) !important;
    border-radius: 5px !important;
    font-size: 0.875rem;
}

.type-select-wrap :deep(.select-trigger:hover),
.type-select-wrap :deep(.select-trigger:focus) {
    background-color: var(--color-hover-background) !important;
    border-color: var(--color-border) !important;
    outline: none !important;
}

.dropdown-wrapper {
  position: relative;
  width: 100%;
}

.dropdown-toggle.table-row-select {
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-align: left;
}

.dropdown-toggle.table-row-select::after {
  content: '';
  display: inline-block;
  margin-left: 8px;
  border-top: .35em solid currentColor;
  border-right: .35em solid transparent;
  border-left: .35em solid transparent;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--color-primary-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: 0 8px 24px #0008;
  z-index: 1000;
}

.dropdown-list {
  list-style: none;
  padding: 6px;
  margin: 0;
  max-height: 260px;
  overflow-y: auto;
}

.dropdown-item {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-primary-text);
}

.dropdown-item:hover,
.dropdown-item.active {
  background-color: var(--color-hover-background);
}

.dropdown-empty {
  padding: 8px;
  color: var(--color-secondary-text);
}
</style>