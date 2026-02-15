<template>
  <div class="section-form section-color-table-form">
    <div class="section-form-row">
      <label class="section-form-label">Тип градиента</label>
      <div class="section-form-toggle-group section-form-toggle-group--wide">
        <button v-for="opt in GRADIENT_TYPE_OPTIONS" :key="opt.value" type="button" class="section-form-toggle-btn" :class="{ active: model.gradientType === opt.value }" @click="update('gradientType', opt.value)">{{ opt.label }}</button>
      </div>
    </div>
    <div class="section-form-row section-form-row-preset">
      <div class="section-form-label section-form-label--control">
        <SelectBox
          v-model="presetId"
          :options="currentPresets"
          value-key="id"
          label-key="label"
          :include-all-option="false"
          class="section-color-table-select-box"
        >
          <template #selected="{ option }">
            <span class="section-color-table-select-swatch" :style="{ background: option ? getGradientCss(option.colors, false) : currentPresetGradient }" />
            <span class="section-color-table-select-label">{{ (option ? option.label : currentPreset?.label) ?? '' }}</span>
          </template>
          <template #option="{ option, label }">
            <span class="section-color-table-select-swatch" :style="{ background: getGradientCss(option?.colors ?? [], false) }" />
            <span>{{ label }}</span>
          </template>
        </SelectBox>
      </div>
      <div class="section-color-table-preset-wrap">
        <div class="section-color-table-preview" :style="{ background: previewGradient }" />
        <button type="button" class="btn btn-sm section-color-table-reverse-btn" title="Обратить градиент" @click="update('reverseGradient', !model.reverseGradient)">
          <ArrowUpDown size="18" />
        </button>
      </div>
    </div>
    <div class="section-form-row section-form-row-thresholds">
      <label class="section-form-label section-form-label-with-hint">
        <input v-model="useThresholdsLocal" type="checkbox" class="form-check-input" @change="onUseThresholdsChange" />
        <span>Пороговые значения</span>
        <HelpTooltip text="Вы можете вручную установить пороговые числовые значения, которые будут соответствовать каждому цвету" :size="14" class="section-form-hint" />
      </label>
      <template v-if="useThresholdsLocal">
        <input v-for="(_, i) in thresholdInputsCount" :key="i" v-model.number="thresholdValues[i]" type="number" class="form-control form-control-sm section-color-table-threshold-input" placeholder="—" @input="onThresholdInput(i, $event)" />
      </template>
    </div>
    <div class="section-form-row">
      <label class="section-form-label">Пустые значения (null)</label>
      <div class="section-form-toggle-group section-form-toggle-group--wide">
        <button v-for="opt in EMPTY_VALUES_OPTIONS" :key="String(opt.value)" type="button" class="section-form-toggle-btn" :class="{ active: model.emptyAsZero === opt.value }" @click="update('emptyAsZero', opt.value)">{{ opt.label }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ArrowUpDown } from 'lucide-vue-next'
import SelectBox from '@/components/SelectBox.vue'
import HelpTooltip from '@/core/bi/components/help_tooltip.vue'
import { TWO_COLOR_PRESETS, THREE_COLOR_PRESETS, getGradientCss } from './tableColorPresets.js'

const GRADIENT_TYPE_OPTIONS = [
  { value: 'two', label: 'Двухцветный' },
  { value: 'three', label: 'Трехцветный' },
]

const EMPTY_VALUES_OPTIONS = [
  { value: false, label: 'Не окрашивать' },
  { value: true, label: 'Окрашивать как 0' },
]

const props = defineProps({
  modelValue: { type: Object, required: true },
})

const emit = defineEmits(['update:modelValue'])

const model = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const presetId = computed({
  get: () => props.modelValue?.gradientPreset ?? 'blue',
  set: (v) => emit('update:modelValue', { ...props.modelValue, gradientPreset: v }),
})

const currentPresets = computed(() =>
  (props.modelValue?.gradientType === 'three' ? THREE_COLOR_PRESETS : TWO_COLOR_PRESETS)
)

const currentPreset = computed(() => {
  const list = currentPresets.value
  return list.find((p) => p.id === presetId.value) || list[0]
})

const currentPresetGradient = computed(() =>
  getGradientCss(currentPreset.value?.colors ?? ['#eee', '#333'], false)
)

const previewGradient = computed(() =>
  getGradientCss(currentPreset.value?.colors ?? ['#eee', '#333'], props.modelValue?.reverseGradient === true)
)

const useThresholdsLocal = ref(props.modelValue?.useThresholds === true)
const thresholdValues = ref([...(props.modelValue?.thresholds ?? [])])

watch(
  () => props.modelValue?.useThresholds,
  (v) => { useThresholdsLocal.value = v === true }
)
watch(
  () => props.modelValue?.thresholds,
  (t) => { thresholdValues.value = Array.isArray(t) ? [...t] : [] },
  { deep: true }
)
watch(
  () => props.modelValue?.gradientType,
  (type) => {
    const list = type === 'three' ? THREE_COLOR_PRESETS : TWO_COLOR_PRESETS
    const currentId = props.modelValue?.gradientPreset ?? 'blue'
    if (!list.some((p) => p.id === currentId)) {
      emit('update:modelValue', { ...props.modelValue, gradientPreset: list[0]?.id ?? 'blue' })
    }
  }
)
watch(
  () => [props.modelValue?.gradientType, props.modelValue?.useThresholds],
  () => {
    if (!props.modelValue?.useThresholds) return
    const n = props.modelValue?.gradientType === 'three' ? 3 : 2
    const t = props.modelValue?.thresholds ?? []
    const arr = [...t]
    while (arr.length < n) arr.push(null)
    if (arr.length > n) arr.length = n
    thresholdValues.value = arr
    if (JSON.stringify(arr) !== JSON.stringify(props.modelValue?.thresholds)) {
      emit('update:modelValue', { ...props.modelValue, thresholds: arr })
    }
  }
)

const thresholdInputsCount = computed(() =>
  props.modelValue?.gradientType === 'three' ? 3 : 2
)

function update(key, value) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function onUseThresholdsChange() {
  const next = useThresholdsLocal.value
  const thresholds = next ? (props.modelValue?.gradientType === 'three' ? [null, null, null] : [null, null]) : []
  emit('update:modelValue', { ...props.modelValue, useThresholds: next, thresholds })
  thresholdValues.value = [...thresholds]
}

function onThresholdInput(index, event) {
  const raw = Number(event.target.value)
  const arr = [...(props.modelValue?.thresholds ?? [])]
  while (arr.length <= index) arr.push(null)
  arr[index] = Number.isFinite(raw) ? raw : null
  emit('update:modelValue', { ...props.modelValue, thresholds: arr })
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
    width: 260px;
    min-width: 260px;
    font-size: 0.875rem;
    color: var(--color-secondary-text);

    &.section-form-label--control {
      display: flex;
      align-items: center;
    }
  }
}

.section-form-label-with-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  width: auto;
  min-width: 0;
}

.section-form-hint {
  margin-left: 2px;
  color: var(--color-secondary-text);
  cursor: help;
}

.section-form-toggle-group {
  display: flex;
  gap: 0;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--color-secondary-background);

  .section-form-toggle-btn {
    flex: 1;
    min-width: 80px;
    padding: 6px 10px;
    font-size: 0.875rem;
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
  }

  &.section-form-toggle-group--wide .section-form-toggle-btn {
    min-width: 130px;
  }
}

.section-form-row-preset {
  align-items: center;
}

.section-form-row-thresholds {
  min-height: 34px;
  align-items: center;
}

.section-color-table-preset-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 0;
}

.section-color-table-swatch {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid var(--color-secondary-background);
  flex-shrink: 0;
}

.section-color-table-select-box {
  width: 260px;
  min-width: 0;

  :deep(.select-trigger) {
    min-height: 31px;
    padding-top: 0.25rem;
    padding-bottom: 0.25rem;

    > span:first-child {
      min-width: 0;
    }
  }
}

.section-color-table-select-swatch {
  width: 24px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid var(--color-secondary-background);
  flex-shrink: 0;
  display: inline-block;
  vertical-align: middle;
  margin-right: 8px;
}

.section-color-table-select-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.section-color-table-preview {
  flex: 1;
  min-width: 120px;
  max-width: 280px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid var(--color-secondary-background);
}

.section-color-table-reverse-btn {
  padding: 4px;
  color: var(--color-secondary-text);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: var(--color-accent);
    background: var(--color-hover-background);
  }
}

.section-color-table-threshold-input {
  width: 80px;
}
</style>
