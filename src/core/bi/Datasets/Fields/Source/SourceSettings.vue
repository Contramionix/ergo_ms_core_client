<template>
  <div ref="rootRef" class="source-settings">
    <div class="settings-main">
      <div class="settings-top d-flex align-items-center gap-3">
        <input v-model="local.name" class="form-control form-control-sm flex-grow-1" placeholder="Название поля" />
        <div v-if="!formulaOnly" class="tab-group">
          <button class="tab-button" :class="{ active: activeTab === 'formula' }" @click="activeTab = 'formula'">Формула</button>
          <button class="tab-button" :class="{ active: activeTab === 'field' }" @click="activeTab = 'field'">Поле из источника</button>
        </div>
        <button class="btn btn-sm btn-outline-secondary ms-auto" v-if="activeTab === 'formula'" @click="showHelp = !showHelp">Справочник</button>
      </div>
      <div class="settings-body">
        <SourceSettingsFormula v-if="activeTab === 'formula'" ref="formulaRef" v-model:expression="expression" v-model:formula-valid="formulaValid" :fields="fieldsList" :params="paramsList"/>
        <SourceSettingsField v-else v-model:search="search" :tables="tables" :selected-connection="selectedConnection" :field="field" @insert-field="insertField" @update:field-state="fieldStateFromChild = $event"/>
        <div class="modal-actions d-flex justify-content-end gap-2 mt-3" :class="{ 'no-footer': !showHelp || activeTab === 'field' }">
          <button type="button" class="btn btn-cancel" @click="$emit('close')">Отменить</button>
          <button type="button" class="btn btn-accept" :disabled="!canApply" @click="apply">{{ acceptButtonLabel }}</button>
        </div>
      </div>
    </div>
    <div v-if="showHelp" class="settings-footer">
      <SourceSettingsHelp />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useToast } from 'vue-toastification'
import SourceSettingsField from './SourceSettingsField.vue'
import SourceSettingsFormula from './SourceSettingsFormula.vue'
import SourceSettingsHelp from './SourceSettingsHelp.vue'

const toast = useToast()

const props = defineProps({
  field: Object,
  cols: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] },
  tables: { type: Array, default: () => [] },
  selectedConnection: { type: Object, default: null },
  formulaOnly: { type: Boolean, default: false },
  params: { type: Array, default: () => [] }
})
const emit = defineEmits(['close', 'create'])

const local = ref({ ...props.field })

function isFormulaField(field) {
  if (!field) return false
  const ex = field.expression
  return ex != null && String(ex).trim() !== ''
}

const activeTab = ref(props.formulaOnly ? 'formula' : (isFormulaField(props.field) ? 'formula' : 'field'))
const expression = ref(props.field?.expression ?? '')
const search = ref('')

const formulaRef = ref(null)
const formulaValid = ref(true)
const fieldStateFromChild = ref(null)

const fieldsList = computed(() => {
  if (!props.cols) return []
  if (!props.rows || !props.rows.length) {
    return props.cols.map(col => ({ name: col, type: 'string' }))
  }
  return props.cols.map((col, idx) => {
    const values = props.rows.map(row => row[idx])
    return {
      name: col,
      type: detectColumnType(values)
    }
  })
})

const paramsList = computed(() => props.params || [])

const rootRef = ref(null)
const showHelp = ref(activeTab.value !== 'field')

const isEditing = computed(() => !!props.field)

const canCreate = computed(() => {
  const nameOk = ((local.value?.name ?? '') + '').trim().length > 0
  if (activeTab.value !== 'formula') return nameOk
  return nameOk && formulaValid.value
})

function normAgg(v) {
  return (v === '' || v == null || v === 'none') ? 'none' : String(v)
}

function normSourceTableId(fieldOrState) {
  const st = fieldOrState?.source_table
  if (st == null) return null
  if (typeof st === 'object' && st !== null && 'id' in st) return String(st.id)
  return String(st)
}

function normSourceColumn(fieldOrState) {
  const src = fieldOrState?.source
  return (src && src.column) ? String(src.column).trim() : ''
}

const hasChanges = computed(() => {
  if (!isEditing.value) return true
  const nameCur = (local.value?.name ?? '').toString().trim()
  const nameOrig = (props.field?.name ?? '').toString().trim()
  if (activeTab.value === 'formula') {
    const exprCur = expression.value ?? ''
    const exprOrig = props.field?.expression ?? ''
    return nameCur !== nameOrig || exprCur !== exprOrig
  }
  if (activeTab.value === 'field') {
    const s = fieldStateFromChild.value
    if (!s) return nameCur !== nameOrig
    const curTableId = s.source_table ? String(s.source_table?.id ?? s.source_table) : null
    const curCol = normSourceColumn(s)
    const curType = (s.type ?? '').toString()
    const curAgg = normAgg(s.aggregation)
    const origTableId = isFormulaField(props.field) ? null : normSourceTableId(props.field)
    const origCol = isFormulaField(props.field) ? '' : normSourceColumn(props.field)
    const origType = isFormulaField(props.field) ? '' : (props.field?.type ?? '').toString()
    const origAgg = isFormulaField(props.field) ? 'none' : normAgg(props.field?.aggregation)
    return nameCur !== nameOrig || curTableId !== origTableId || curCol !== origCol || curType !== origType || curAgg !== origAgg
  }
  return nameCur !== nameOrig
})

const canApply = computed(() => canCreate.value && (!isEditing.value || hasChanges.value))

const acceptButtonLabel = computed(() => (isEditing.value ? 'Изменить' : 'Создать'))

function detectColumnType(values) {
  const filtered = values.filter(v => v !== null && v !== undefined && v !== '')
  if (!filtered.length) return 'string'
  if (filtered.every(v => /^(\d{4}-\d{2}-\d{2})$/.test(v) || v instanceof Date)) return 'date'
  if (filtered.every(v => /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?)$/.test(v))) return 'date&time'
  if (filtered.every(v => v === 'true' || v === 'false' || typeof v === 'boolean')) return 'bool'
  if (filtered.every(v => !isNaN(v) && Number.isInteger(+v))) return 'integer'
  if (filtered.every(v => !isNaN(v) && !Number.isNaN(parseFloat(v)))) return 'float'
  return 'string'
}

watch(activeTab, tab => {
  if (tab === 'field') showHelp.value = false
  else showHelp.value = true
  if (tab === 'formula') formulaValid.value = true
})

watch(() => [props.field, props.formulaOnly], ([newField, formulaOnly]) => {
  if (newField?.expression !== undefined) expression.value = newField.expression ?? ''
  // Обновляем local.value при изменении props.field
  if (newField) {
    local.value = { ...newField }
  }
  if (formulaOnly) {
    activeTab.value = 'formula'
    return
  }
  if (!newField) return
  activeTab.value = isFormulaField(newField) ? 'formula' : 'field'
}, { deep: true })

function insertField(name) {
  if (activeTab.value === 'formula' && formulaRef.value?.insertAtCursor) {
    formulaRef.value.insertAtCursor(`[${name}]`)
  } else {
    expression.value += name
  }
}

function apply() {
  const rawName = local.value?.name
  const trimmedName = typeof rawName === 'string' ? rawName.trim() : ''
  const isEmpty = !trimmedName
  if (isEmpty) {
    toast.warning('Укажите название поля')
    return
  }
  const payload = { ...local.value, expression: expression.value, mode: activeTab.value }
  if (activeTab.value === 'formula') {
    if (!payload.type) payload.type = 'expression'
    if (!payload.aggregation || payload.aggregation === '') payload.aggregation = 'none'
  }
  if (activeTab.value === 'field' && fieldStateFromChild.value) {
    const s = fieldStateFromChild.value
    payload.source_table = s.source_table ?? undefined
    payload.source = s.source?.column ? { column: s.source.column } : (payload.source || {})
    payload.type = s.type || payload.type
    payload.aggregation = normAgg(s.aggregation) === 'none' ? 'none' : (s.aggregation || 'none')
  }
  emit('create', payload)
}
</script>

<style scoped lang="scss">
.source-settings {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.settings-main {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.settings-top {
  padding: 0 1rem 1rem 0;
  gap: .5rem;
  flex-shrink: 0;
}

.settings-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-actions {
  margin-top: auto;
  padding-bottom: 20px;

  &.no-footer {
    margin-top: 1rem;
    padding-bottom: 0;
  }
}

.settings-footer {
  flex: 0 0 300px;
  min-height: 0;
  background: var(--color-primary-background);
  overflow: auto;
  border-top: 1px solid var(--color-border);
}

.tab-group {
  display: inline-flex;
  align-items: center;
  border: 1px solid #0b5ed7;
  border-radius: 6px;
  overflow: hidden;
  height: 2rem;
}

.tab-button {
  background: transparent;
  color: #0b5ed7;
  border: none;
  padding: 0 1rem;
  font-size: 0.85rem;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.tab-button.active {
  background: #0b5ed7;
  color: #fff;
}

.tab-button:not(.active):hover {
  background: rgba(11, 94, 215, 0.15);
}

.settings-top input.form-control {
  border: 1px solid var(--color-border) !important;
  border-radius: 5px !important;
  max-width: 300px;
}

.modal-actions .btn {
  padding: 0.5rem 1.5rem;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
}

.modal-actions .btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-actions .btn-cancel {
  background-color: var(--color-primary-background);
  color: var(--color-primary-text);
}

.modal-actions .btn-cancel:hover:not(:disabled) {
  background-color: #f0f0f0;
}

.modal-actions .btn-accept {
  background-color: #0b5ed7;
  color: white;
}

.modal-actions .btn-accept:hover:not(:disabled) {
  background-color: #0a4b9a;
}
</style>