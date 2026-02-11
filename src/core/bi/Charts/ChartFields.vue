<template>
  <div class="chart-fields-modal">
    <div class="search-box">
      <input v-model="search" type="text" class="form-control form-control-sm" placeholder="Поиск..." />
    </div>
    <ul v-if="virtualFieldsForSlot.length" class="fields-list virtual-fields">
      <li v-for="f in virtualFieldsForSlot" :key="f.id" class="field-item" :class="{ selected: isSelected(f) }" @click="!isSelected(f) && selectField(f)" @mouseenter="onFieldItemMouseEnter" @mouseleave="onFieldItemMouseLeave">
        <span class="field-icon">
          <component :is="typeIcon[f.type] || Type" size="16" />
        </span>
        <span class="field-name">
          <span class="field-name-inner">{{ f.displayName ?? f.label ?? f.name }}</span>
        </span>
      </li>
    </ul>
    <ul class="fields-list">
      <b>Показатели:</b>
      <li v-for="f in availableFields" :key="f.id" class="field-item" :class="{ selected: isSelected(f) }" @click="!isSelected(f) && selectField(f)" @mouseenter="onFieldItemMouseEnter" @mouseleave="onFieldItemMouseLeave">
        <span class="field-icon">
          <component :is="typeIcon[f.type] || Type" size="16" />
        </span>
        <span class="field-name">
          <span class="field-name-inner">{{ f.name }}</span>
        </span>
      </li>
      <li v-if="!availableFields.length && !virtualFieldsForSlot.length" class="field-empty">
        <i>Ничего не найдено</i>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Type, Hash, Calendar, CheckCircle, Globe, MapPin } from 'lucide-vue-next'

const props = defineProps({
  fields: { type: Array, default: () => [] },
  selected: { type: Array, default: () => [] },
  allowedTypes: { type: Array, default: () => null },
  measuresInChart: { type: Array, default: () => [] },
  currentSlotConfig: { type: Object, default: () => null }
})
const emit = defineEmits(['select'])
const search = ref('')

import { MEASURE_NAMES_FIELD, MEASURE_VALUES_FIELD } from './js/measureVirtualFields.js'

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

const virtualFieldsForSlot = computed(() => {
  const measures = props.measuresInChart || []
  const slot = props.currentSlotConfig
  if (!measures.length || !slot) return []
  const list = []
  if (slot.allowMeasureNames) list.push(MEASURE_NAMES_FIELD)
  if (slot.allowMeasureValues) list.push(MEASURE_VALUES_FIELD)
  return list
})

const availableFields = computed(() => {
  const filtered = (props.fields || [])
    .filter(f => !props.allowedTypes || props.allowedTypes.includes(f.type))
    .filter(f => f.name.toLowerCase().includes(search.value.trim().toLowerCase()))
  
  return filtered
})

function isSelected(field) {
  return props.selected.some(f => (f.name ?? f.id) === (field.name ?? field.id))
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
.field-name {
  font-weight: 500;
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  border: 1.5px solid #198754;
  cursor: not-allowed;
}
</style>
