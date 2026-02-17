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
        <SourceSettingsFormula
          v-if="activeTab === 'formula'"
          ref="formulaRef"
          v-model:expression="expression"
          :fields="fieldsList"
          :params="paramsList"
        />
        <SourceSettingsField v-else v-model:search="search" :tables="tables" :selected-connection="selectedConnection" :field="field" @insert-field="insertField"/>
        <div class="modal-actions d-flex justify-content-end gap-2 mt-3" :class="{ 'no-footer': !showHelp || activeTab === 'field' }">
          <button class="btn btn-sm cancel-btn" @click="$emit('close')">Отменить</button>
          <button class="btn btn-sm btn-primary" @click="apply">Создать</button>
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
import SourceSettingsField from './SourceSettingsField.vue'
import SourceSettingsFormula from './SourceSettingsFormula.vue'
import SourceSettingsHelp from './SourceSettingsHelp.vue'

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

function isTableSource(field) {
  if (!field) return false
  // Если поле имеет source_table (id или объект) или в source указан table — считаем источником таблицу
  const hasSourceTable = !!field.source_table
  const hasSourceWithTable = !!(field.source && field.source.table)
  return hasSourceTable || hasSourceWithTable
}

const activeTab = ref(props.formulaOnly ? 'formula' : (isTableSource(props.field) ? 'field' : 'formula'))
const expression = ref(props.field?.expression ?? '')
const search = ref('')

const formulaRef = ref(null)

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
  activeTab.value = isTableSource(newField) ? 'field' : 'formula'
}, { deep: true })

function insertField(name) {
  if (activeTab.value === 'formula' && formulaRef.value?.insertAtCursor) {
    formulaRef.value.insertAtCursor(`[${name}]`)
  } else {
    expression.value += name
  }
}

function apply() {
  const payload = { ...local.value, expression: expression.value, mode: activeTab.value }
  if (activeTab.value === 'formula') {
    if (!payload.type) payload.type = 'expression'
    if (!payload.aggregation || payload.aggregation === '') payload.aggregation = 'none'
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
    padding-bottom: 40px;
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
  border: 1px solid var(--color-accent);
  border-radius: 6px;
  overflow: hidden;
  height: 2rem;
}

.tab-button {
  background: transparent;
  color: var(--color-accent);
  border: none;
  padding: 0 1rem;
  font-size: 0.85rem;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

.tab-button.active {
  background: var(--color-accent);
  color: #fff;
}

.tab-button:not(.active):hover {
  background: rgba(229, 57, 53, 0.2);
}

.settings-top input.form-control {
  border: 1px solid var(--color-border) !important;
  border-radius: 5px !important;
  max-width: 300px;
}

.cancel-btn {
  color: var(--color-secondary-text);
  border-color: var(--color-border);
  background: transparent;
  transition: background-color .2s ease, color .2s ease;
}

.cancel-btn:hover,
.cancel-btn:focus {
  color: var(--color-primary-text);
  background-color: var(--color-hover-background);
}
</style>