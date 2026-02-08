<template>
  <div class="fields-page">
    <div v-if="connectionStatus === 'error'" class="connection-error-banner">
      <div class="error-icon">⚠️</div>
      <div class="error-content">
        <div class="error-title">Проблемы с подключением</div>
        <div class="error-description">
          В выбранном подключении обнаружены проблемы с файлами или подключением. 
          Редактирование полей может быть ограничено.
        </div>
      </div>
      <button class="error-action-btn" @click="$emit('switch-to-sources')">Перейти к источникам</button>
    </div>

    <div class="table-container">
      <table class="table table-hover">
      <thead>
        <tr>
          <th>#</th>
          <th>Имя</th>
          <th>Источник поля</th>
          <th>Тип</th>
          <th>Агрегация</th>
          <th>Описание</th>
          <th class="text-end">…</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(f, idx) in props.fields" :key="f.id" class="hover:cursor-pointer">
          <td>{{ idx + 1 }}</td>
          <td class="name-cell">
            <div class="name-cell-inner">
              <div v-show="editingNameId !== f.id" class="name-field-display" @click.prevent="startEditName(f, $event)" @mouseenter="onNameHoverStart" @mouseleave="onNameHoverEnd">
                <span class="name-label-wrap">
                  <span class="name-label-inner">{{ f.name || '\u00A0' }}</span>
                </span>
              </div>
              <input v-if="editingNameId === f.id" :ref="nameInputRef" v-model="f.name" @input="updateField(idx, 'name', f.name)" @blur="onNameBlur" class="form-control form-control-sm name-edit-input" placeholder="Имя…"/>
            </div>
          </td>
          <td class="source-cell">
            <span v-if="f.expression">
              <button class="source-btn" @click="onSourceClick(f)"><SquareFunction /></button>
            </span>
            <span v-else>
              <button class="source-btn" @click="onSourceClick(f)" @mouseenter="onSourceHoverStart" @mouseleave="onSourceHoverEnd">
                <span class="source-label-wrap">
                  <span class="source-label-inner">{{ f.source ? getFieldSourceLabel(f) : 'Нет источника' }}</span>
                </span>
              </button>
            </span>
          </td>
          <td>
            <select v-model="f.type" class="form-select form-select">
              <option v-for="typeOption in getTypeOptionsForField(f)" :key="typeOption.value" :value="typeOption.value">
                {{ typeOption.label }}
              </option>
            </select>
          </td>
          <td>
            <AggSelect :modelValue="f.aggregation" @update:modelValue="val => updateField(idx, 'aggregation', val)" :options="getAggregationOptions(f.type)" :aggregationColorMap="aggregationColorMap"/>
          </td>
          <td>
            <input v-model="f.description" class="form-control form-control-sm" placeholder="Описание…" />
          </td>
          <td>
            <button class="btn btn-sm btn-outline-danger rounded" @click="removeField(idx)">Удалить</button>
          </td>
        </tr>
      </tbody>
    </table>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import AggSelect from '@/core/bi/Datasets/Fields/AggregationSelect.vue'
import { SquareFunction } from 'lucide-vue-next';

import { getTypeOptionsForField, getAggregationOptions, aggregationColorMap } from '@/core/bi/Datasets/Fields/Source/js/DatasetPreviewFieldOptions.js'

const editingNameId = ref(null)
const nameInputRef = ref(null)

const props = defineProps({
  fields: { type: Array, default: () => [] },
  tables: { type: Array, default: () => [] },
  cols: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] },
  datasetId: { type: [Number, String], default: null },
  connectionStatus: { type: String, default: 'connected' }
})

const emit = defineEmits(['edit-field', 'add-field', 'update:fields', 'removeTable', 'switch-to-sources'])

function updateField(idx, key, value) {
  const newFields = props.fields.map((f, i) => (i === idx ? { ...f, [key]: value } : f))
  emit('update:fields', newFields)
}

function removeField(idx) {
  const newFields = props.fields.slice()
  newFields.splice(idx, 1)
  emit('update:fields', newFields)
}

function onSourceClick(field) {
  emit('edit-field', field)
}

function onSourceHoverStart(ev) {
  const wrap = ev.currentTarget?.querySelector('.source-label-wrap')
  const inner = ev.currentTarget?.querySelector('.source-label-inner')
  if (!wrap || !inner) return
  const overflow = inner.scrollWidth - wrap.clientWidth
  if (overflow > 0) {
    inner.style.transform = `translateX(-${overflow}px)`
  }
}

function onSourceHoverEnd(ev) {
  const inner = ev.currentTarget?.querySelector('.source-label-inner')
  if (inner) inner.style.transform = ''
}

function onNameBlur() {
  editingNameId.value = null
}

function startEditName(field, ev) {
  if (ev) {
    ev.stopPropagation()
  }
  editingNameId.value = field.id
  nextTick(() => {
    setTimeout(() => {
      const input = nameInputRef.value ?? document.querySelector('.fields-page .name-edit-input')
      input?.focus()
    }, 0)
  })
}

function onNameHoverStart(ev) {
  const wrap = ev.currentTarget?.querySelector('.name-label-wrap')
  const inner = ev.currentTarget?.querySelector('.name-label-inner')
  if (!wrap || !inner) return
  const overflow = inner.scrollWidth - wrap.clientWidth
  if (overflow > 0) {
    inner.style.transform = `translateX(-${overflow}px)`
  }
}

function onNameHoverEnd(ev) {
  const inner = ev.currentTarget?.querySelector('.name-label-inner')
  if (inner) inner.style.transform = ''
}

function getFieldSourceLabel(field) {
  const isObjectTable = field && field.source_table && typeof field.source_table === 'object'
  const tbl = isObjectTable
    ? field.source_table
    : props.tables.find(t => String(t.id) === String(field.source_table))

  const tableLabel = tbl
    ? (tbl.display_name || tbl.name || tbl.table || tbl.file_upload_name || '')
    : (field.source && field.source.table ? field.source.table : '')

  const columnLabel = (field.source && field.source.column) ? field.source.column : field.name

  if (tableLabel) {
    return `${columnLabel}.${tableLabel}`
  }
  return columnLabel
}

</script>

<style scoped lang="scss">
.table td,
.table th {
  vertical-align: middle;
  padding-left: 1rem;
  padding-right: 1rem;
}

:deep(.table) {
  table-layout: fixed;
}

:deep(.table th:first-child),
:deep(.table td:first-child) {
  width: 2.5rem;
  min-width: 2.5rem;
  max-width: 2.5rem;
}

:deep(.table th:nth-child(2)),
:deep(.table td:nth-child(2)) {
  width: 320px;
}

:deep(.table th:nth-child(3)),
:deep(.table td:nth-child(3)) {
  width: 250px;
}

:deep(.table th:nth-child(5)),
:deep(.table td:nth-child(5)) {
  width: 150px;
}

:deep(.table tbody tr) {
  height: 2.5rem;
}

:deep(.table tbody tr td) {
  height: 2.5rem;
  max-height: 2.5rem;
}

:deep(.table tbody td) {
  border-bottom: none !important;
}


:deep(.table-hover tbody tr:hover) {
  background-color: var(--color-hover-background);
}

:deep(input.form-control),
:deep(select.form-select) {
  background: transparent !important;
  border: none !important;
  border-radius: 5px !important;
  padding: .25rem .5rem;
  color: inherit;
  transition: background-color .2s ease, border-radius .2s ease;
}

:deep(input.form-control:hover),
:deep(select.form-select:hover),
:deep(input.form-control:focus),
:deep(select.form-select:focus) {
  background-color: var(--color-hover-background) !important;
  border-radius: 6px !important;
  outline: none !important;
  box-shadow: none !important;
}

:deep(select.form-select) {
  appearance: none;
  background-image: none !important;
  padding-right: 1.5rem;
}

:deep(select.form-select::-ms-expand) {
  display: none;
}

.name-cell {
  overflow: hidden;
}

.name-cell-inner {
  height: 2.5rem;
  max-height: 2.5rem;
  overflow: hidden;
  display: flex;
  align-items: center;
  box-sizing: border-box;
}

.name-cell .name-edit-input {
  font-size: inherit;
  line-height: 1.25;
  height: 2rem;
  max-height: 2rem;
  box-sizing: border-box;
  padding: .25rem .5rem;
  border: none !important;
  outline: none !important;
}

.name-field-display {
  cursor: text;
  padding: .25rem .5rem;
  border-radius: 5px;
  transition: background-color .2s ease, border-radius .2s ease;
  display: flex;
  align-items: center;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  line-height: 1.25;
  height: 2rem;
  max-height: 2rem;
}

.name-field-display:hover {
  background-color: var(--color-hover-background);
  border-radius: 6px;
}

.name-label-wrap {
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.name-label-inner {
  display: inline-block;
  white-space: nowrap;
  transition: transform 2s ease;
}

.source-cell {
  overflow: hidden;
}

.source-btn {
  width: 100%;
  text-align: left;
  background: transparent !important;
  border: none !important;
  padding: .25rem .5rem;
  border-radius: 5px !important;
  color: inherit;
  display: flex;
  align-items: center;
  min-width: 0;
  transition: background-color .2s ease, border-radius .2s ease;
}

.source-label-wrap {
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-label-inner {
  display: inline-block;
  white-space: nowrap;
  transition: transform 2s ease;
}

.source-btn:hover,
.source-btn:focus {
  background-color: var(--color-hover-background) !important;
  border-radius: 6px !important;
  outline: none !important;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity .3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.scale-enter-active,
.scale-leave-active {
  transition: transform .3s ease, opacity .3s ease;
}

.scale-enter-from,
.scale-leave-to {
  transform: scale(0.9);
  opacity: 0;
}

.fields-page {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.table-container {
  flex: 1 1 auto;
  min-height: 300px;
  overflow-y: auto;
  overflow-x: auto;
  position: relative;
  -webkit-overflow-scrolling: touch;
}

.table-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.table-container::-webkit-scrollbar-track {
  background: transparent;
}

.table-container::-webkit-scrollbar-thumb {
  background-color: var(--color-border, #dee2e6);
  border-radius: 4px;
}

.table-container::-webkit-scrollbar-thumb:hover {
  background-color: var(--color-hover-background, #e9ecef);
}

:deep(.table thead) {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: var(--color-primary-background, #fff);
}

:deep(.table thead th) {
  background-color: var(--color-primary-background, #fff);
  border-bottom: 0.5px solid var(--color-border);
}

.connection-error-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%);
  border: 1px solid #feb2b2;
  border-radius: 8px;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.error-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.error-content {
  flex: 1;
}

.error-title {
  font-weight: 600;
  color: #c53030;
  margin-bottom: 4px;
  font-size: 14px;
}

.error-description {
  color: #742a2a;
  font-size: 13px;
  line-height: 1.4;
}

.error-action-btn {
  background: #c53030;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.error-action-btn:hover {
  background: #9b2c2c;
}
</style>