<template>
  <div class="section-form">
    <div class="section-form-row">
      <label class="section-form-label">Масштабирование</label>
      <div class="section-form-toggle-group">
        <button v-for="opt in SCALE_MODE_OPTIONS" :key="opt.value" type="button" class="section-form-toggle-btn" :class="{ active: model.scaleMode === opt.value }" @click="update('scaleMode', opt.value)">{{ opt.label }}</button>
      </div>
    </div>
    <div v-if="model.scaleMode === 'auto'" class="section-form-row">
      <label class="section-form-label"></label>
      <div class="section-form-toggle-group">
        <button v-for="opt in SCALE_RANGE_OPTIONS" :key="opt.value" type="button" class="section-form-toggle-btn" :class="{ active: model.scaleRange === opt.value }" @click="update('scaleRange', opt.value)">{{ opt.label }}</button>
      </div>
    </div>
    <div v-if="model.scaleMode === 'manual'" class="section-form-row section-form-row--indent">
      <label class="section-form-label">Минимум</label>
      <input :value="scaleMinDisplay" type="number" step="any" class="form-control form-control-sm section-form-input section-form-input--number" :placeholder="model.axisType === 'log' ? '0.001' : '0'" @input="onScaleBoundInput('scaleMin', $event.target.value)">
    </div>
    <div v-if="model.scaleMode === 'manual'" class="section-form-row section-form-row--indent">
      <label class="section-form-label">Максимум</label>
      <input :value="model.scaleMax" type="number" class="form-control form-control-sm section-form-input section-form-input--number" placeholder="100" @input="onScaleBoundInput('scaleMax', $event.target.value)">
    </div>
    <div class="section-form-row">
      <label class="section-form-label">Тип оси</label>
      <div class="section-form-toggle-group">
        <button v-for="opt in AXIS_TYPE_OPTIONS" :key="opt.value" type="button" class="section-form-toggle-btn" :class="{ active: model.axisType === opt.value }" @click="update('axisType', opt.value)">{{ opt.label }}</button>
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
    <div v-if="model.axisOnChart && model.axisFormat === 'manual' && formatOptions.length > 0" class="section-form-row section-form-row--indent">
      <label class="section-form-label">Формат:</label>
      <SelectBox
        class="section-form-select"
        :model-value="model.axisFormatValue"
        :options="formatOptions"
        value-key="value"
        label-key="label"
        :include-all-option="false"
        size="sm"
        label=""
        @update:model-value="v => update('axisFormatValue', v)"
      />
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
        <button
          v-for="opt in GRID_STEP_OPTIONS"
          :key="opt.value"
          type="button"
          class="section-form-toggle-btn"
          :class="{ active: model.gridStep === opt.value }"
          :disabled="model.displayMode === 'discrete' && opt.value === 'manual'"
          @click="model.displayMode === 'discrete' && opt.value === 'manual' ? null : update('gridStep', opt.value)"
        >{{ opt.label }}</button>
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
    <div class="section-form-row">
      <label class="section-form-label">Пустые значения (null)</label>
      <div class="section-form-toggle-group section-form-toggle-group--three">
        <button v-for="opt in NULL_HANDLING_OPTIONS" :key="opt.value" type="button" class="section-form-toggle-btn" :class="{ active: model.nullHandling === opt.value }" @click="update('nullHandling', opt.value)">{{ opt.label }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import SelectBox from '@/components/SelectBox.vue'

const SCALE_MODE_OPTIONS = [
  { value: 'auto', label: 'Авто' },
  { value: 'manual', label: 'Вручную' },
]
const SCALE_RANGE_OPTIONS = [
  { value: 'min_max', label: 'Автомасштаб от min до max' },
  { value: 'zero_max', label: 'Автомасштаб от 0 до max' },
]
const AXIS_TYPE_OPTIONS = [
  { value: 'linear', label: 'Линейная' },
  { value: 'log', label: 'Логарифмическая' },
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
  { value: 'first_field', label: 'По первому полю на оси Y' },
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
const NULL_HANDLING_OPTIONS = [
  { value: 'hide', label: 'Не отображать' },
  { value: 'connect', label: 'Соединять' },
  { value: 'zero', label: 'Отображать как 0' },
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
  if (type === 'date' || type === 'date&time') return DATE_FORMAT_OPTIONS
  if (type === 'integer' || type === 'float' || type === 'number') return NUMBER_FORMAT_OPTIONS
  return []
})

const LOG_MIN = 0.001
const scaleMinDisplay = computed(() => {
  const v = model.value.scaleMin
  if (model.value.axisType === 'log' && (v === 0 || v == null || v < 0)) return LOG_MIN
  return v
})

function update(key, value) {
  const next = { ...model.value, [key]: value }
  if (key === 'displayMode' && value === 'discrete' && next.gridStep === 'manual') {
    next.gridStep = 'auto'
  }
  if (key === 'axisType' && value === 'log') {
    if (next.scaleMin === 0 || next.scaleMin == null || next.scaleMin < LOG_MIN) next.scaleMin = LOG_MIN
  }
  if (key === 'axisType' && value === 'linear' && next.scaleMin === LOG_MIN) {
    next.scaleMin = 0
  }
  model.value = next
}

function onScaleBoundInput(key, raw) {
  const n = Number(raw)
  if (Number.isNaN(n)) return
  if (key === 'scaleMin' && model.value.axisType === 'log' && n <= 0) {
    update('scaleMin', LOG_MIN)
    return
  }
  update(key, n)
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
