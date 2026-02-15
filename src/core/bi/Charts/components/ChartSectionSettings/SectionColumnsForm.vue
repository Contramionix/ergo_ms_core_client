<template>
  <div class="section-form section-columns-form">
    <div class="section-form-row">
      <label class="section-form-label">
        Закрепление
        <HelpTooltip text="Укажите число столбцов для закрепления при горизонтальном скролле" :size="14" class="section-form-hint" />
      </label>
      <input v-model.number="pinnedCountInput" type="number" min="0" step="1" class="form-control form-control-sm section-form-pinned-input" />
    </div>
    <div class="section-form-block">
      <label class="section-form-block-label">
        Ширина
        <HelpTooltip text="Общая ширина таблицы всегда занимает 100% доступного пространства вне зависимости от указанной ширины отдельных столбцов" :size="14" class="section-form-hint" />
      </label>
      <div v-for="f in sectionFields" :key="colKey(f)" class="section-form-row section-form-row-width">
        <span class="section-form-col-name">
          <component :is="getFieldIcon(f)" size="16" class="section-form-col-icon" />
          {{ f.displayName ?? f.name }}
        </span>
        <div class="section-form-toggle-group">
          <button v-for="opt in WIDTH_MODE_OPTIONS" :key="opt.value" type="button" class="section-form-toggle-btn" :class="{ active: widthMode(f) === opt.value }" @click="setWidthMode(f, opt.value)">{{ opt.label }}</button>
        </div>
        <input :value="widthMode(f) === 'auto' ? '—' : widthValue(f)" type="text" inputmode="decimal" class="form-control form-control-sm section-form-width-input" :disabled="widthMode(f) === 'auto'" @input="onWidthValueInput(f, $event)" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Type, Hash, Calendar, CheckCircle, MapPin, Globe } from 'lucide-vue-next'
import HelpTooltip from '@/core/bi/components/help_tooltip.vue'

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

function getFieldIcon(f) {
  return typeIcon[f?.type] || Type
}

const WIDTH_MODE_OPTIONS = [
  { value: 'auto', label: 'Авто' },
  { value: 'percent', label: '%' },
  { value: 'px', label: 'px' },
]

const props = defineProps({
  modelValue: { type: Object, required: true },
  sectionFields: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])

const model = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const pinnedCountInput = computed({
  get: () => (model.value.pinnedCount ?? 0),
  set: (v) => {
    const n = Math.max(0, Math.floor(Number(v)) || 0)
    emit('update:modelValue', { ...model.value, pinnedCount: n })
  },
})

function colKey(f) {
  return f.id ?? f.name
}

function widthMode(f) {
  const key = colKey(f)
  return model.value.widths?.[key]?.mode ?? 'auto'
}

function widthValue(f) {
  const key = colKey(f)
  const w = model.value.widths?.[key]
  if (!w || w.mode === 'auto') return undefined
  return w.value ?? (w.mode === 'percent' ? 100 : 100)
}

function setWidthMode(f, mode) {
  const key = colKey(f)
  const widths = { ...(model.value.widths || {}) }
  const current = widths[key] ?? { mode: 'auto' }
  if (mode === 'auto') {
    delete widths[key]
  } else {
    widths[key] = { mode, value: current.value ?? (mode === 'percent' ? 100 : 100) }
  }
  emit('update:modelValue', { ...model.value, widths })
}

function onWidthValueInput(f, event) {
  const key = colKey(f)
  const raw = Number(event.target.value)
  const mode = widthMode(f)
  const value = mode === 'percent' ? Math.max(1, Math.min(100, Math.floor(raw) || 1)) : Math.max(1, Math.floor(raw) || 1)
  const widths = { ...(model.value.widths || {}) }
  widths[key] = { ...(widths[key] || { mode: 'auto' }), mode, value }
  emit('update:modelValue', { ...model.value, widths })
}
</script>

<style lang="scss" scoped>
.section-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-form-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  .section-form-label {
    margin: 0;
    flex-shrink: 0;
    width: 140px;
    min-width: 140px;
    font-size: 0.875rem;
    color: var(--color-secondary-text);
  }
}

.section-form-hint {
  margin-left: 4px;
  vertical-align: middle;
  color: var(--color-secondary-text);
  cursor: help;
}

.section-form-pinned-input {
  width: 80px;
}

.section-form-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-form-block-label {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-secondary-text);
  display: flex;
  align-items: center;
  gap: 6px;
}

.section-form-row-width {
  align-items: center;
  gap: 8px;
}

.section-form-col-name {
  flex-shrink: 0;
  min-width: 120px;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
  color: var(--color-primary-text);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.section-form-col-icon {
  flex-shrink: 0;
  color: var(--color-accent);
}

.section-form-toggle-group {
  display: flex;
  gap: 0;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--color-secondary-background);

  .section-form-toggle-btn {
    flex: 1;
    min-width: 50px;
    padding: 6px 8px;
    font-size: 0.875rem;
    border: none;
    background: var(--color-secondary-background);
    color: var(--color-secondary-text);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;

    &.active {
      background: #0b5ed7;
      color: white;
    }

    &:hover:not(.active) {
      background: var(--color-hover-background);
    }
  }
}

.section-form-width-input {
  width: 70px;
}
</style>
