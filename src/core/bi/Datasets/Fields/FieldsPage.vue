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
      <table class="table table-header">
        <thead>
          <tr>
            <th>#</th>
            <th>Имя</th>
            <th>Источник поля</th>
            <th>Тип</th>
            <th>Агрегация</th>
            <th>Описание</th>
            <th class="text-end"></th>
          </tr>
        </thead>
      </table>
      <div class="table-body-scroll">
        <table class="table table-hover table-body">
          <tbody>
        <tr v-for="(f, idx) in props.fields" :key="f.id" class="hover:cursor-pointer" :class="{ 'show-actions': hoveredRowIdx === idx || openMenuIdx === idx }" @mouseenter="hoveredRowIdx = idx" @mouseleave="hoveredRowIdx = null">
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
          <td class="type-select-cell">
            <SelectBox :modelValue="f.type" @update:modelValue="val => updateField(idx, 'type', val)" :options="getTypeOptionsForField(f)" value-key="value" label-key="label" :include-all-option="false" size="sm">
              <template #selected="{ option, label }">
                <span class="d-flex align-items-center gap-2 flex-grow-1 min-w-0">
                  <span class="d-flex align-items-center flex-shrink-0" :style="{ color: getTypeColor(option?.value) }">
                    <component :is="typeIcon[option?.value] || Type" :size="18" />
                  </span>
                  <span class="text-truncate">{{ label }}</span>
                </span>
              </template>
              <template #option="{ value, label }">
                <span class="d-flex align-items-center gap-2">
                  <span class="d-flex align-items-center flex-shrink-0" :style="{ color: getTypeColor(value) }">
                    <component :is="typeIcon[value] || Type" :size="18" />
                  </span>
                  {{ label }}
                </span>
              </template>
            </SelectBox>
          </td>
          <td>
            <AggSelect :modelValue="f.aggregation" @update:modelValue="val => updateField(idx, 'aggregation', val)" :options="getAggregationOptions(f.type)" :aggregationColorMap="aggregationColorMap"/>
          </td>
          <td>
            <input v-model="f.description" class="form-control form-control-sm" placeholder="Описание…" />
          </td>
          <td class="field-actions-cell">
            <div class="field-actions-wrap">
              <button type="button" class="field-actions-btn" @click.stop="toggleMenu(idx)" :aria-expanded="openMenuIdx === idx"><MoreHorizontal :size="18" /></button>
              <div v-if="openMenuIdx === idx" ref="menuDropdownRef" class="field-actions-dropdown" :class="{ 'field-actions-dropdown-up': menuOpenUpward }" @click.stop>
                <div class="field-actions-item" @click="onDuplicate(idx)">Дублировать</div>
                <div class="field-actions-item" @click="onEdit(idx)">Редактировать</div>
                <div class="field-actions-item danger" @click="onRemove(idx)">Удалить</div>
              </div>
            </div>
          </td>
        </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onBeforeUnmount, watch } from 'vue'
import SelectBox from '@/components/SelectBox.vue'
import AggSelect from '@/core/bi/Datasets/Fields/AggregationSelect.vue'
import { SquareFunction, MoreHorizontal, Type, Hash, Calendar, CheckCircle, MapPin, Globe } from 'lucide-vue-next'

import { getTypeOptionsForField, getAggregationOptions, aggregationColorMap } from '@/core/bi/Datasets/Fields/Source/js/DatasetPreviewFieldOptions.js'

const typeIcon = {
  string: Type,
  integer: Hash,
  float: Hash,
  number: Hash,
  date: Calendar,
  'date&time': Calendar,
  bool: CheckCircle,
  boolean: CheckCircle,
  geopoint: MapPin,
  geopolygon: Globe,
}

const typeColor = {
  string: '#0d6efd',
  integer: '#198754',
  float: '#198754',
  number: '#198754',
  date: '#fd7e14',
  'date&time': '#fd7e14',
  bool: '#20c997',
  boolean: '#20c997',
  geopoint: '#dc3545',
  geopolygon: '#6f42c1',
}

function getTypeColor(type) {
  if (!type || typeof type !== 'string') return 'var(--color-accent)'
  return typeColor[type] ?? 'var(--color-accent)'
}

const editingNameId = ref(null)
const nameInputRef = ref(null)
const openMenuIdx = ref(null)
const menuDropdownRef = ref(null)
const menuOpenUpward = ref(false)
const hoveredRowIdx = ref(null)

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

function toggleMenu(idx) {
  openMenuIdx.value = openMenuIdx.value === idx ? null : idx
}

function closeMenu() {
  openMenuIdx.value = null
}

function getDropdownEl() {
  const raw = menuDropdownRef.value
  if (!raw) return null
  if (Array.isArray(raw)) {
    const idx = openMenuIdx.value
    return (idx !== null && raw[idx]) ? raw[idx] : raw.find(Boolean) ?? null
  }
  return raw
}

function getScrollContainer(el) {
  if (!el) return null
  let parent = el.parentElement
  while (parent) {
    const style = getComputedStyle(parent)
    const overflowY = style.overflowY || style.overflow
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') return parent
    parent = parent.parentElement
  }
  return null
}

function updateMenuDropdownPlacement() {
  const dropdown = getDropdownEl()
  if (!dropdown) return
  const trigger = dropdown.previousElementSibling
  if (!trigger) return
  const triggerRect = trigger.getBoundingClientRect()
  const dropdownHeight = dropdown.getBoundingClientRect().height
  const gap = 4
  const scrollContainer = getScrollContainer(trigger)
  const visibleBottom = scrollContainer
    ? scrollContainer.getBoundingClientRect().bottom
    : window.innerHeight
  const spaceBelow = visibleBottom - triggerRect.bottom
  menuOpenUpward.value = spaceBelow < dropdownHeight + gap
}

function handleClickOutside(ev) {
  if (openMenuIdx.value === null) return
  const target = ev.target
  if (!target || !(target instanceof Node)) return
  const dropdown = getDropdownEl()
  const isInsideDropdown = dropdown && dropdown.contains(target)
  const isOnTrigger = target.closest?.('.field-actions-btn')
  if (isInsideDropdown || isOnTrigger) return
  closeMenu()
}

function duplicateField(idx) {
  const field = props.fields[idx]
  const copy = { ...field, id: `copy-${Date.now()}-${idx}` }
  const newFields = props.fields.slice()
  newFields.splice(idx + 1, 0, copy)
  emit('update:fields', newFields)
}

function onDuplicate(idx) {
  duplicateField(idx)
  closeMenu()
}

function onEdit(idx) {
  emit('edit-field', props.fields[idx])
  closeMenu()
}

function onRemove(idx) {
  removeField(idx)
  closeMenu()
}

let clickOutsideCleanup = null

watch(openMenuIdx, (val) => {
  if (clickOutsideCleanup) {
    clickOutsideCleanup()
    clickOutsideCleanup = null
  }
  if (val === null) {
    menuOpenUpward.value = false
    return
  }
  nextTick(() => {
    requestAnimationFrame(() => {
      updateMenuDropdownPlacement()
    })
  })
  const run = () => {
    document.addEventListener('click', handleClickOutside, true)
    clickOutsideCleanup = () => {
      document.removeEventListener('click', handleClickOutside, true)
    }
  }
  setTimeout(run, 0)
})

onBeforeUnmount(() => {
  if (clickOutsideCleanup) clickOutsideCleanup()
})

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

:deep(.table th:nth-child(6)),
:deep(.table td:nth-child(6)) {
  min-width: 170px;
}

:deep(.table th:nth-child(7)),
:deep(.table td:nth-child(7)) {
  width: 3.5rem;
  min-width: 3.5rem;
  max-width: 3.5rem;
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

.type-select-cell {
  max-width: 100%;
  min-width: 0;
}

.type-select-cell :deep(.select-box) {
  max-width: 100%;
}

.type-select-cell :deep(.select-trigger) {
  background: transparent !important;
  border: none !important;
  border-radius: 5px !important;
  box-shadow: none !important;
  padding: .25rem .5rem;
  min-height: 2rem;
  color: inherit;
  transition: background-color .2s ease, border-radius .2s ease;
}

.type-select-cell :deep(.select-trigger:hover),
.type-select-cell :deep(.select-trigger:focus) {
  background-color: var(--color-hover-background) !important;
  border-radius: 6px !important;
  outline: none !important;
  box-shadow: none !important;
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

.field-actions-cell {
  position: relative;
  text-align: right;
  padding-right: 1rem;
}

.field-actions-wrap {
  position: relative;
  display: inline-flex;
  justify-content: flex-end;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

:deep(tr.show-actions) .field-actions-wrap {
  opacity: 1;
  pointer-events: auto;
}

.field-actions-btn {
  background: transparent;
  border: none;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-primary-text);
  transition: background-color 0.2s ease;
}

.field-actions-btn:hover {
  background-color: var(--color-hover-background);
}

.field-actions-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 2px;
  background-color: var(--color-primary-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  z-index: 20;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  min-width: 120px;
  padding: 2px 0;
  text-align: left;
}
.field-actions-dropdown.field-actions-dropdown-up {
  top: auto;
  bottom: 100%;
  margin-top: 0;
  margin-bottom: 2px;
}

.field-actions-item {
  padding: 6px 10px;
  font-size: 0.85rem;
  color: var(--color-primary-text);
  cursor: pointer;
  transition: background-color 0.15s ease;
  line-height: 1.2;
  text-align: left;
}

.field-actions-item:hover {
  background-color: var(--color-hover-background);
}

.field-actions-item.danger {
  color: var(--color-accent);
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
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 0;
}

.table-header {
  flex: 0 0 auto;
  margin-bottom: 0;
}

.table-header thead {
  margin-bottom: 0;
}

.table-body-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-gutter: stable;
}

.table-body-scroll::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.table-body-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.table-body-scroll::-webkit-scrollbar-thumb {
  background-color: var(--color-border, #dee2e6);
  border-radius: 4px;
}

.table-body-scroll::-webkit-scrollbar-thumb:hover {
  background-color: var(--color-hover-background, #e9ecef);
}

:deep(.table-header thead th) {
  background-color: var(--color-primary-background, #fff);
  border-bottom: 0.5px solid var(--color-border);
  padding-bottom: 0.5rem;
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