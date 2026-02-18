<template>
    <div class="field-body">
        <div class="body-table">
            <div class="table-row">
                <div class="table-row-label">Источник</div>
                <div class="dropdown-wrapper select-2 type-select-wrap">
                    <SelectBox :model-value="selectedTable?.id ?? null" :options="tables" value-key="id" label-key="name" :include-all-option="false" all-label="Выберите таблицу" :searchable="true" search-placeholder="Поиск таблицы..." :current-label-formatter="tableLabelFormatter" size="sm" @update:model-value="onTableChange"/>
                </div>
            </div>
            <div class="table-row">
                <div class="table-row-label">Поле источника</div>
                <div class="dropdown-wrapper select-2 type-select-wrap">
                    <SelectBox v-model="selectedColumn" :options="columns" :include-all-option="false" all-label="Выберите поле" :searchable="true" search-placeholder="Поиск по полям..." size="sm" :disabled="!selectedTable"/>
                </div>
            </div>
            <div class="table-row">
                <div class="table-row-label">Тип поля</div>
                <div class="dropdown-wrapper select-2 type-select-wrap">
                    <SelectBox :model-value="selectedType" @update:model-value="val => selectedType = val" :options="typeOptionsAvailable" value-key="value" label-key="label" :include-all-option="false" all-label="Выберите тип" size="sm">
                        <template #selected="{ option, label }">
                            <span class="d-flex align-items-center gap-2 flex-grow-1 min-w-0">
                                <span class="d-flex align-items-center flex-shrink-0" :style="{ color: getFieldCategoryColor(fieldForCategory) }">
                                    <component :is="typeIcon[option?.value] || typeIcon.string" :size="16" />
                                </span>
                                <span class="text-truncate">{{ label }}</span>
                            </span>
                        </template>
                        <template #option="{ value, label }">
                            <span class="d-flex align-items-center gap-2">
                                <span class="d-flex align-items-center flex-shrink-0" :style="{ color: getFieldCategoryColor(fieldForCategory) }">
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
                    <SelectBox :model-value="selectedAggregation || 'none'" @update:model-value="val => selectedAggregation = val" :options="aggregationOptions" value-key="value" label-key="label" :include-all-option="false" all-label="Нет" size="sm" :disabled="!selectedType"/>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import SelectBox from '@/components/SelectBox.vue'
import { fetchTableColumns } from './js/tableColumnsService'
import { getTypeOptionsForField, getAggregationOptions } from '@/core/bi/Datasets/Fields/Source/js/DatasetPreviewFieldOptions.js'
import { typeIcon, getFieldCategoryColor } from '../js/fieldTypeDisplay.js'

const props = defineProps({
    tables: { type: Array, default: () => [] },
    selectedConnection: { type: Object, default: null },
    field: { type: Object, default: null }
})

const emit = defineEmits(['update:search', 'insert-field', 'update:field-state'])

function emitFieldState() {
    const t = selectedTable.value
    const col = selectedColumn.value?.trim() || ''
    emit('update:field-state', {
        source_table: t ?? null,
        source: col ? { column: col } : {},
        type: selectedType.value || '',
        aggregation: (selectedAggregation.value || 'none') === 'none' ? 'none' : selectedAggregation.value
    })
}

const selectedTable = ref(null)
const columns = ref([])
const selectedColumn = ref('')
const selectedType = ref('')
const selectedAggregation = ref('')

const fieldForCategory = computed(() => ({
  aggregation: selectedAggregation.value ?? props.field?.aggregation ?? 'none'
}))

const connectionName = computed(() => props.selectedConnection?.name || 'Подключение')

function tableLabel(t) {
    return t?.name || ((t?.schema && t?.table) ? `${t.schema}.${t.table}` : (t?.table || ''))
}

function tableLabelFormatter({ option }) {
    if (!option) return ''
    return `${connectionName.value}.${tableLabel(option)}`
}

async function onTableChange(id) {
    const t = props.tables.find(tbl => String(tbl.id) === String(id)) ?? null
    selectedTable.value = t
    selectedColumn.value = ''
    if (t) {
        columns.value = await fetchTableColumns(t).catch(() => [])
    } else {
        columns.value = []
    }
}

function isFormulaField(field) {
    if (!field) return false
    const ex = field.expression
    return ex != null && String(ex).trim() !== ''
}

function resolveSelectedFromField() {
    if (!props.field) return
    const initialType = props.field.type ? String(props.field.type) : ''
    const initialAggregation = props.field.aggregation ? String(props.field.aggregation) : ''

    if (isFormulaField(props.field)) {
        selectedTable.value = null
        selectedColumn.value = ''
        selectedType.value = ''
        selectedAggregation.value = 'none'
        columns.value = []
    } else {
        const srcTbl = props.field.source_table
        const src = props.field.source
        const initialColumn = src && src.column ? String(src.column) : ''
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
    }

    if (!isFormulaField(props.field)) {
        if (initialType) selectedType.value = initialType
        selectedAggregation.value = initialAggregation || 'none'
    }
}

const aggregationOptions = computed(() => getAggregationOptions(selectedType.value))

const typeOptionsAvailable = computed(() => getTypeOptionsForField(props.field || {}))

watch(() => props.tables, resolveSelectedFromField, { deep: true })
watch(() => props.field, resolveSelectedFromField, { deep: true, immediate: true })

watch(selectedType, () => {
    const values = new Set(aggregationOptions.value.map(o => o.value))
    if (!values.has(selectedAggregation.value)) {
        selectedAggregation.value = 'none'
    }
})

watch([selectedTable, selectedColumn, selectedType, selectedAggregation], () => {
    emitFieldState()
}, { deep: true, immediate: true })
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

.type-select-wrap :deep(.value-text) {
    font-size: 0.875rem !important;
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
</style>