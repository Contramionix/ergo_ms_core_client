<template>
  <div v-if="visible" class="modal-backdrop fade show" @click="close"></div>
  <ModalCenter
    v-if="visible"
    modal-id="chartSettingsFieldModal"
    :title="field?.displayName ?? field?.name ?? ''"
    custom-class="show d-block"
    dialog-class="modal-lg"
    @closemodal="close"
  >
    <template #title>
      <span v-if="field" class="field-modal-title-icon">
        <component :is="getFieldIcon(field)" size="20" />
      </span>
      <span>{{ field?.displayName ?? field?.name ?? '' }}</span>
    </template>
    <div class="field-modal-content">
      <div class="field-modal-row">
        <label class="field-modal-label">Название</label>
        <input v-model="local.displayName" type="text" class="form-control form-control-sm" />
      </div>

      <div class="field-modal-row">
        <label class="field-modal-label">Тип (до агрегации)</label>
        <SelectBox
          v-model="local.type"
          :options="typeOptions"
          value-key="value"
          label-key="label"
          :include-all-option="false"
          size="sm"
          label=""
        />
      </div>

      <div class="field-modal-row">
        <label class="field-modal-label">Агрегация</label>
        <SelectBox
          v-model="local.aggregation"
          :options="aggregationOptions"
          value-key="value"
          label-key="label"
          :include-all-option="false"
          size="sm"
          label=""
        />
      </div>

      <div class="field-modal-row">
        <label class="field-modal-label">Подпись</label>
        <div class="field-modal-toggle-group">
          <button
            v-for="opt in CAPTION_OPTIONS"
            :key="String(opt.value)"
            type="button"
            class="field-modal-toggle-btn"
            :class="{ active: local.showCaption === opt.value }"
            @click="local.showCaption = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <template v-if="isNumericType">
        <div class="field-modal-row">
          <label class="field-modal-label">Формат</label>
          <div class="field-modal-toggle-group">
            <button
              v-for="opt in FORMAT_OPTIONS"
              :key="opt.value"
              type="button"
              class="field-modal-toggle-btn"
              :class="{ active: local.format === opt.value }"
              @click="local.format = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div v-if="isFractionalType" class="field-modal-row">
          <label class="field-modal-label">Знаков после запятой</label>
          <div class="field-modal-decimal-control">
            <button type="button" class="btn btn-sm btn-outline-secondary" @click="decDecimalPlaces">-</button>
            <input v-model.number="local.decimalPlaces" type="number" min="0" max="20" class="form-control form-control-sm" />
            <button type="button" class="btn btn-sm btn-outline-secondary" @click="incDecimalPlaces">+</button>
          </div>
        </div>

        <div class="field-modal-row">
          <label class="field-modal-label">Отображать группы разрядов</label>
          <div class="field-modal-toggle-group">
            <button
              v-for="opt in DIGIT_GROUPING_OPTIONS"
              :key="opt.value"
              type="button"
              class="field-modal-toggle-btn"
              :class="{ active: local.digitGrouping === opt.value }"
              @click="local.digitGrouping = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div class="field-modal-row">
          <label class="field-modal-label">Префикс</label>
          <input v-model="local.prefix" type="text" class="form-control form-control-sm" />
        </div>

        <div class="field-modal-row">
          <label class="field-modal-label">Постфикс</label>
          <input v-model="local.postfix" type="text" class="form-control form-control-sm" />
        </div>

        <div class="field-modal-row">
          <label class="field-modal-label">Размерность</label>
          <SelectBox
            v-model="local.dimension"
            :options="DIMENSION_OPTIONS"
            value-key="value"
            label-key="label"
            :include-all-option="false"
            size="sm"
            label=""
          />
        </div>
      </template>

      <div class="modal-actions-buttons">
        <button type="button" class="btn btn-cancel" @click="close">Отменить</button>
        <button type="button" class="btn btn-accept" @click="apply">Применить</button>
      </div>
    </div>
  </ModalCenter>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { Type, Hash, Calendar, CheckCircle, MapPin, Globe } from 'lucide-vue-next'
import ModalCenter from '@/components/ModalCenter.vue'
import SelectBox from '@/components/SelectBox.vue'
import { typeOptions, getAggregationOptions } from '@/core/bi/Datasets/Fields/Source/js/DatasetPreviewFieldOptions.js'
import { isVirtualMeasureField } from '../js/measureVirtualFields.js'

const DIMENSION_OPTIONS = [
  { value: 'none', label: 'Нет' },
  { value: 'auto', label: 'Авто' },
  { value: 'k', label: 'Тысячи, К' },
  { value: 'm', label: 'Миллионы, М' },
  { value: 'b', label: 'Миллиарды, В' },
  { value: 't', label: 'Триллионы, Т' },
]

const FORMAT_OPTIONS = [
  { value: 'number', label: 'Число' },
  { value: 'percent', label: 'Процент' },
]

const DIGIT_GROUPING_OPTIONS = [
  { value: 'with_separator', label: 'С разделителем' },
  { value: 'without', label: 'Слитно' },
]

const CAPTION_OPTIONS = [
  { value: false, label: 'Скрыть' },
  { value: true, label: 'Показать' },
]

const props = defineProps({
  visible: { type: Boolean, default: false },
  field: { type: Object, default: null },
})

const emit = defineEmits(['update:visible', 'apply'])

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
  if (isVirtualMeasureField(f)) return Type
  return typeIcon[f?.type] || Type
}

const aggregationOptions = computed(() => {
  const type = local.value?.type ?? props.field?.type ?? 'string'
  return getAggregationOptions(type)
})

const isNumericType = computed(() => {
  const t = local.value?.type ?? props.field?.type
  return t === 'integer' || t === 'float' || t === 'number'
})

const isFractionalType = computed(() => {
  const t = local.value?.type ?? props.field?.type
  return t === 'float' || t === 'number'
})

const defaultLocal = () => ({
  displayName: '',
  type: 'string',
  aggregation: 'none',
  showCaption: true,
  format: 'number',
  decimalPlaces: 0,
  digitGrouping: 'with_separator',
  prefix: '',
  postfix: '',
  dimension: 'none',
})

const local = ref(defaultLocal())

function syncFromField() {
  if (!props.field) return
  local.value = {
    displayName: props.field.displayName ?? props.field.name ?? '',
    type: props.field.type ?? 'string',
    aggregation: props.field.aggregation ?? 'none',
    showCaption: props.field.showCaption !== false,
    format: props.field.format ?? 'number',
    decimalPlaces: Math.max(0, Math.min(20, Number(props.field.decimalPlaces) || 0)),
    digitGrouping: props.field.digitGrouping ?? 'with_separator',
    prefix: props.field.prefix ?? '',
    postfix: props.field.postfix ?? '',
    dimension: props.field.dimension ?? 'none',
  }
}

watch(
  () => [props.visible, props.field],
  () => {
    if (props.visible && props.field) syncFromField()
  },
  { immediate: true }
)

function decDecimalPlaces() {
  local.value.decimalPlaces = Math.max(0, (local.value.decimalPlaces ?? 0) - 1)
}

function incDecimalPlaces() {
  local.value.decimalPlaces = Math.min(20, (local.value.decimalPlaces ?? 0) + 1)
}

function close() {
  emit('update:visible', false)
}

function apply() {
  const payload = {
    displayName: local.value.displayName || undefined,
    type: local.value.type,
    aggregation: local.value.aggregation,
    showCaption: local.value.showCaption,
  }
  if (isNumericType.value) {
    payload.format = local.value.format
    payload.decimalPlaces = local.value.decimalPlaces
    payload.digitGrouping = local.value.digitGrouping
    payload.prefix = local.value.prefix || undefined
    payload.postfix = local.value.postfix || undefined
    payload.dimension = local.value.dimension
  }
  emit('apply', payload)
  close()
}
</script>

<style lang="scss" scoped>
.field-modal-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field-modal-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: nowrap;

  .field-modal-label {
    margin-bottom: 0;
    flex-shrink: 0;
    width: 150px;
    min-width: 150px;
  }

  .form-select,
  .form-control,
  .select-box {
    flex: 1;
    min-width: 0;
  }

  :deep(.select-trigger) {
    min-height: 31px;
    padding-top: 0.25rem;
    padding-bottom: 0.25rem;
  }
}

.field-modal-label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.875rem;
  color: var(--color-secondary-text);
  white-space: normal;
  overflow-wrap: break-word;
  word-break: break-word;
}

.field-modal-title-icon {
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.field-modal-toggle-group {
  display: flex;
  gap: 0;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--color-secondary-background);
  min-width: 260px;
  width: max-content;

  .field-modal-toggle-btn {
    flex: 0 0 50%;
    width: 50%;
    min-width: 0;
    padding: 6px 12px;
    font-size: 0.875rem;
    border: none;
    background: var(--color-primary-background);
    color: var(--color-secondary-text);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    white-space: nowrap;
    text-align: center;
    box-sizing: border-box;

    &.active {
      background: #0b5ed7;
      color: white;
    }

    &:hover:not(.active) {
      background: var(--color-hover-background);
    }
  }
}

.field-modal-decimal-control {
  display: flex;
  align-items: center;
  gap: 8px;

  .form-control {
    width: 4rem;
    text-align: center;
  }
}

.modal-actions-buttons {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
  padding-top: 12px;
  border-top: 1px solid var(--color-secondary-background);
  justify-content: flex-end;
}

.btn-cancel {
  background-color: var(--color-primary-background);
  color: var(--color-primary-text);
  border-radius: 6px;

  &:hover:not(:disabled) {
    background-color: var(--color-hover-background);
  }
}

.btn-accept {
  background-color: #0b5ed7;
  color: white;
  border-radius: 6px;

  &:hover:not(:disabled) {
    background-color: #0a4b9a;
  }
}
</style>
