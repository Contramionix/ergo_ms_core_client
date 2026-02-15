<template>
  <div class="section-form">
    <div class="section-form-row">
      <label class="section-form-label">Тип оси</label>
      <div class="section-form-toggle-group">
        <button v-for="opt in AXIS_TYPE_OPTIONS" :key="opt.value" type="button" class="section-form-toggle-btn" :class="{ active: model.axisType === opt.value }" @click="update('axisType', opt.value)">{{ opt.label }}</button>
      </div>
    </div>
    <div class="section-form-row">
      <label class="section-form-label">Режим отображения</label>
      <div class="section-form-toggle-group">
        <button v-for="opt in DISPLAY_MODE_OPTIONS" :key="opt.value" type="button" class="section-form-toggle-btn" :class="{ active: model.displayMode === opt.value }" @click="update('displayMode', opt.value)">{{ opt.label }}</button>
      </div>
    </div>
    <div class="section-form-row">
      <label class="section-form-label">Ось на графике</label>
      <div class="section-form-toggle-group">
        <button v-for="opt in BOOL_OPTIONS" :key="opt.value" type="button" class="section-form-toggle-btn" :class="{ active: model.axisOnChart === opt.value }" @click="update('axisOnChart', opt.value)">{{ opt.label }}</button>
      </div>
    </div>
    <div v-if="model.axisOnChart" class="section-form-row">
      <label class="section-form-label">Название оси</label>
      <div class="section-form-toggle-group section-form-toggle-group--three">
        <button v-for="opt in AXIS_NAME_OPTIONS" :key="opt.value" type="button" class="section-form-toggle-btn" :class="{ active: model.axisName === opt.value }" @click="update('axisName', opt.value)">{{ opt.label }}</button>
      </div>
    </div>
    <div v-if="model.axisOnChart && model.axisName === 'manual'" class="section-form-row section-form-row--indent">
      <label class="section-form-label"></label>
      <input :value="model.axisNameText" type="text" class="form-control form-control-sm section-form-input" placeholder="Введите название оси" @input="update('axisNameText', $event.target.value)">
    </div>
    <div v-if="model.axisOnChart" class="section-form-row">
      <label class="section-form-label">Форматирование оси</label>
      <div class="section-form-toggle-group section-form-toggle-group--three">
        <button v-for="opt in AXIS_FORMAT_OPTIONS" :key="opt.value" type="button" class="section-form-toggle-btn" :class="{ active: model.axisFormat === opt.value }" @click="update('axisFormat', opt.value)">{{ opt.label }}</button>
      </div>
    </div>
    <div v-if="model.axisOnChart && showFormatRow" class="section-form-row section-form-row--indent">
      <label class="section-form-label">Формат:</label>
      <SelectBox class="section-form-select" :model-value="model.axisFormatValue" :options="formatOptions" value-key="value" label-key="label" :include-all-option="false" size="sm" label="" @update:model-value="v => update('axisFormatValue', v)"/>
    </div>
    <div v-if="model.axisOnChart" class="section-form-row">
      <label class="section-form-label">Сетка</label>
      <div class="section-form-toggle-group">
        <button v-for="opt in BOOL_OPTIONS" :key="opt.value" type="button" class="section-form-toggle-btn" :class="{ active: model.grid === opt.value }" @click="update('grid', opt.value)">{{ opt.label }}</button>
      </div>
    </div>
    <div v-if="model.axisOnChart && model.grid" class="section-form-row">
      <label class="section-form-label">Шаг сетки, px</label>
      <div class="section-form-toggle-group">
        <button v-for="opt in GRID_STEP_OPTIONS" :key="opt.value" type="button" class="section-form-toggle-btn" :class="{ active: model.gridStep === opt.value }" :disabled="model.displayMode === 'discrete' && opt.value === 'manual'" @click="model.displayMode === 'discrete' && opt.value === 'manual' ? null : update('gridStep', opt.value)">{{ opt.label }}</button>
      </div>
    </div>
    <div v-if="model.axisOnChart && model.grid && model.gridStep === 'manual'" class="section-form-row section-form-row--indent">
      <label class="section-form-label"></label>
      <input :value="model.gridStepPx" type="number" min="1" class="form-control form-control-sm section-form-input section-form-input--number" placeholder="Шаг, px" @input="update('gridStepPx', Number($event.target.value) || 0)">
    </div>
    <div v-if="model.axisOnChart" class="section-form-row">
      <label class="section-form-label">Подписи</label>
      <div class="section-form-toggle-group">
        <button v-for="opt in BOOL_OPTIONS" :key="opt.value" type="button" class="section-form-toggle-btn" :class="{ active: model.labels === opt.value }" @click="update('labels', opt.value)">{{ opt.label }}</button>
      </div>
    </div>
    <div v-if="model.axisOnChart && model.labels" class="section-form-row">
      <label class="section-form-label">Вид подписей</label>
      <div class="section-form-toggle-group section-form-toggle-group--four">
        <button v-for="opt in LABEL_TYPE_OPTIONS" :key="opt.value" type="button" class="section-form-toggle-btn" :class="{ active: model.labelType === opt.value }" @click="update('labelType', opt.value)">{{ opt.label }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import SelectBox from '@/components/SelectBox.vue'

const AXIS_TYPE_OPTIONS = [
  { value: 'linear', label: 'Линейная' },
  { value: 'log', label: 'Логарифмическая' },
]
const DISPLAY_MODE_OPTIONS = [
  { value: 'discrete', label: 'Дискретный' },
  { value: 'continuous', label: 'Непрерывный' },
]
const BOOL_OPTIONS = [
  { value: true, label: 'Вкл' },
  { value: false, label: 'Выкл' },
]
const AXIS_NAME_OPTIONS = [
  { value: true, label: 'Вкл' },
  { value: false, label: 'Выкл' },
  { value: 'manual', label: 'Вручную' },
]
const AXIS_FORMAT_OPTIONS = [
  { value: 'auto', label: 'Авто' },
  { value: 'first_field', label: 'По первому полю на оси Х' },
  { value: 'manual', label: 'Вручную' },
]
const GRID_STEP_OPTIONS = [
  { value: 'auto', label: 'Авто' },
  { value: 'manual', label: 'Вручную' },
]
const LABEL_TYPE_OPTIONS = [
  { value: 'auto', label: 'Авто' },
  { value: 'horizontal', label: 'Горизонтальные' },
  { value: 'vertical', label: 'Вертикальные' },
  { value: 'angled', label: 'Под углом' },
]

const DATE_FORMAT_OPTIONS = [
  { value: 'YYYY', label: 'YYYY' },
  { value: 'MM.YYYY', label: 'MM.YYYY' },
  { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY' },
  { value: 'YYYY-MM', label: 'YYYY-MM' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
]

const NUMBER_FORMAT_OPTIONS = [
  { value: 'number', label: 'Число' },
  { value: 'percent', label: 'Процент' },
]

const props = defineProps({
  axisFields: {
    type: Array,
    default: () => [],
  },
})

const model = defineModel({ type: Object, required: true })

const formatOptions = computed(() => {
  const first = props.axisFields?.[0]
  const type = first?.type
  let result = []
  if (type === 'date' || type === 'date&time') result = DATE_FORMAT_OPTIONS
  else if (type === 'integer' || type === 'float' || type === 'number') result = NUMBER_FORMAT_OPTIONS
  return result
})

const showFormatRow = computed(() => {
  const axisFormat = model.value?.axisFormat
  const len = formatOptions.value?.length ?? 0
  return axisFormat === 'manual' && len > 0
})

function update(key, value) {
  const next = { ...model.value, [key]: value }
  if (key === 'displayMode' && value === 'discrete' && next.gridStep === 'manual') {
    next.gridStep = 'auto'
  }
  model.value = next
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
  flex-wrap: nowrap;

  .section-form-label {
    margin: 0;
    flex-shrink: 0;
    width: 140px;
    min-width: 140px;
    font-size: 0.875rem;
    color: var(--color-secondary-text);
  }
}

.section-form-toggle-group {
  display: flex;
  gap: 0;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--color-secondary-background);
  flex-wrap: nowrap;
  flex: 1;
  min-width: 0;

  .section-form-toggle-btn {
    flex: 1;
    min-width: 60px;
    padding: 6px 10px;
    font-size: 0.8125rem;
    border: none;
    background: var(--color-secondary-background);
    color: var(--color-secondary-text);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    white-space: nowrap;

    &.active {
      background: #0b5ed7;
      color: white;
    }

    &:hover:not(.active) {
      background: var(--color-hover-background);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &--three .section-form-toggle-btn {
    flex: 1;
    min-width: 0;
  }

  &--four .section-form-toggle-btn {
    flex: 1;
    min-width: 0;
  }
}

.section-form-row--indent {
  margin-top: -4px;
}

.section-form-input {
  flex: 1;
  min-width: 0;

  &--number {
    max-width: 120px;
  }
}

.section-form-select {
  flex: 1;
  min-width: 0;

  :deep(.select-trigger) {
    min-height: 28px;
    padding: 4px 8px;
    font-size: 0.8125rem;
  }
}
</style>
