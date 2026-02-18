<template>
  <div class="chart-fields-modal">
    <div class="search-box">
      <input v-model="search" type="text" class="form-control form-control-sm" placeholder="Поиск..." />
    </div>
    <ul v-if="virtualFieldsForSlot.length" class="fields-list virtual-fields">
      <li v-for="f in virtualFieldsForSlot" :key="f.id" class="field-item" :class="{ selected: isSelected(f) }" @click="!isSelected(f) && selectField(f)" @mouseenter="onFieldItemMouseEnter" @mouseleave="onFieldItemMouseLeave">
        <span class="field-icon">
          <component :is="getFieldIcon(f)" size="16" />
        </span>
        <span class="field-name field-name--virtual">
          <span class="field-name-inner">{{ getFieldDisplayName(f) }}</span>
        </span>
      </li>
    </ul>
    <template v-if="availableFields.length">
      <div class="fields-section">
        <button type="button" class="section-header" :aria-expanded="indicatorsOpen" @click="indicatorsOpen = !indicatorsOpen">
          <ChevronDown v-if="indicatorsOpen" :size="16" />
          <ChevronRight v-else :size="16" />
          <span>Показатели</span>
        </button>
        <ul v-show="indicatorsOpen" class="fields-list">
          <li v-for="f in availableFields" :key="f.id" class="field-item" :class="{ selected: isSelected(f) }" @click="!isSelected(f) && selectField(f)" @mouseenter="onFieldItemMouseEnter" @mouseleave="onFieldItemMouseLeave">
            <span class="field-icon">
              <component :is="getFieldIcon(f)" size="16" />
            </span>
            <span class="field-name" :class="{ 'field-name--virtual': isVirtualMeasureField(f) }">
              <span class="field-name-inner">{{ getFieldDisplayName(f) }}</span>
            </span>
          </li>
        </ul>
      </div>
    </template>
    <template v-if="availableMeasures.length">
      <div class="fields-section fields-section--with-border">
        <button type="button" class="section-header" :aria-expanded="measuresOpen" @click="measuresOpen = !measuresOpen">
          <ChevronDown v-if="measuresOpen" :size="16" />
          <ChevronRight v-else :size="16" />
          <span>Измерения</span>
        </button>
        <ul v-show="measuresOpen" class="fields-list">
          <li v-for="f in availableMeasures" :key="f.id ?? f.name" class="field-item" :class="{ selected: isSelected(f) }" @click="!isSelected(f) && selectField(f)" @mouseenter="onFieldItemMouseEnter" @mouseleave="onFieldItemMouseLeave">
            <span class="field-icon field-icon--measures">
              <component :is="getFieldIcon(f)" size="16" />
            </span>
            <span class="field-name">
              <span class="field-name-inner">{{ getFieldDisplayName(f) }}</span>
            </span>
          </li>
        </ul>
      </div>
    </template>
    <template v-if="availableParameters.length">
      <div class="fields-section fields-section--with-border">
        <button type="button" class="section-header" :aria-expanded="parametersOpen" @click="parametersOpen = !parametersOpen">
          <ChevronDown v-if="parametersOpen" :size="16" />
          <ChevronRight v-else :size="16" />
          <span>Параметры</span>
        </button>
        <ul v-show="parametersOpen" class="fields-list">
          <li v-for="f in availableParameters" :key="f.id ?? f.name" class="field-item" :class="{ selected: isSelected(f) }" @click="!isSelected(f) && selectField(f)" @mouseenter="onFieldItemMouseEnter" @mouseleave="onFieldItemMouseLeave">
            <span class="field-icon field-icon--parameters">
              <component :is="getFieldIcon(f)" size="16" />
            </span>
            <span class="field-name">
              <span class="field-name-inner">{{ getFieldDisplayName(f) }}</span>
            </span>
          </li>
        </ul>
      </div>
    </template>
    <ul v-if="nothingFound" class="fields-list">
      <li class="field-empty">
        <i>Ничего не найдено</i>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ChevronDown, ChevronRight } from 'lucide-vue-next'
import { MEASURE_NAMES_FIELD, MEASURE_VALUES_FIELD, isVirtualMeasureField } from './js/measureVirtualFields.js'
import { getFieldIcon, getFieldDisplayName } from './js/fieldIcons.js'
import { MEASURE_COLOR, PARAMETER_ICON_COLOR } from '@/core/bi/Datasets/Fields/js/fieldTypeDisplay.js'

const measureColor = MEASURE_COLOR
const parameterColor = PARAMETER_ICON_COLOR

const props = defineProps({
  fields: { type: Array, default: () => [] },
  measures: { type: Array, default: () => [] },
  parameters: { type: Array, default: () => [] },
  selected: { type: Array, default: () => [] },
  allowedTypes: { type: Array, default: () => null },
  measuresInChart: { type: Array, default: () => [] },
  currentSlotConfig: { type: Object, default: () => null }
})
const emit = defineEmits(['select'])
const search = ref('')
const indicatorsOpen = ref(true)
const measuresOpen = ref(true)
const parametersOpen = ref(true)

const virtualFieldsForSlot = computed(() => {
  const measures = props.measuresInChart || []
  const slot = props.currentSlotConfig
  if (!measures.length || !slot) return []
  const list = []
  if (slot.allowMeasureNames) list.push(MEASURE_NAMES_FIELD)
  if (slot.allowMeasureValues) list.push(MEASURE_VALUES_FIELD)
  return list
})

const searchLower = computed(() => search.value.trim().toLowerCase())

const availableFields = computed(() => {
  return (props.fields || [])
    .filter(f => !props.allowedTypes || props.allowedTypes.includes(f.type))
    .filter(f => (f.name ?? '').toLowerCase().includes(searchLower.value) || (f.displayName ?? '').toLowerCase().includes(searchLower.value) || (f.title ?? '').toLowerCase().includes(searchLower.value))
})

const availableMeasures = computed(() => {
  return (props.measures || [])
    .filter(f => !props.allowedTypes || props.allowedTypes.includes(f.type))
    .filter(f => (f.name ?? '').toLowerCase().includes(searchLower.value) || (f.displayName ?? '').toLowerCase().includes(searchLower.value) || (f.title ?? '').toLowerCase().includes(searchLower.value))
})

const availableParameters = computed(() => {
  return (props.parameters || [])
    .filter(f => !props.allowedTypes || props.allowedTypes.includes(f.type))
    .filter(f => (f.name ?? '').toLowerCase().includes(searchLower.value) || (f.displayName ?? '').toLowerCase().includes(searchLower.value) || (f.title ?? '').toLowerCase().includes(searchLower.value))
})

const nothingFound = computed(() =>
  !virtualFieldsForSlot.value.length && !availableFields.value.length && !availableMeasures.value.length && !availableParameters.value.length
)

function isSelected(field) {
  const fieldKey = field.id ?? field.name
  return props.selected.some(f => (f.id ?? f.name) === fieldKey)
}

function selectField(field) {
  emit('select', field)
}

function onFieldItemMouseEnter(ev) {
  const nameEl = ev.currentTarget?.querySelector('.field-name')
  const innerEl = ev.currentTarget?.querySelector('.field-name-inner')
  if (!nameEl || !innerEl) return
  const overflow = innerEl.scrollWidth - nameEl.clientWidth
  if (overflow > 0) {
    innerEl.style.transform = `translateX(-${overflow}px)`
  }
}

function onFieldItemMouseLeave(ev) {
  const innerEl = ev.currentTarget?.querySelector('.field-name-inner')
  if (innerEl) innerEl.style.transform = ''
}
</script>

<style scoped>
.chart-fields-modal {
  padding-right: 14px;
  overflow-y: auto;
  height: 100%;
}
.search-box {
  margin-bottom: 12px;
}
.fields-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.fields-list.virtual-fields {
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-secondary-background, #eee);
}
.fields-list--section {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-secondary-background, #eee);
}
.fields-section {
  margin-bottom: 4px;
}
.fields-section--with-border {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-secondary-background, #eee);
}
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  margin: 0;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary-text);
  text-align: left;
  border-radius: 6px;
  transition: background 0.15s;
}
.section-header:hover,
.section-header:focus-visible {
  background: var(--color-hover-background);
}
.field-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 14px;
  color: var(--color-primary-text);
  transition: background .2s;
  cursor: pointer;
}
.field-item:hover {
  background: var(--color-hover-background);
}
.field-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--color-accent);
}
.field-icon--measures {
  color: v-bind(measureColor);
}
.field-icon--parameters {
  color: v-bind(parameterColor);
}
.field-name {
  font-weight: 500;
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.field-name--virtual {
  font-style: italic;
}

.field-name-inner {
  display: inline-block;
  white-space: nowrap;
  transition: transform 2s ease;
}
.field-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  color: var(--color-secondary-text);
  padding: 24px 0;
}
.selected {
  background: var(--color-hover-background) !important;
  border: 1.5px solid v-bind(measureColor);
  cursor: not-allowed;
}
</style>