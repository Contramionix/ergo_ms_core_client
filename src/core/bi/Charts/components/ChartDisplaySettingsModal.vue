<template>
  <div v-if="visible" class="modal-backdrop fade show" @click="close"></div>
  <ModalCenter v-if="visible" modal-id="chartDisplaySettingsModal" title="Настройки чарта" custom-class="show d-block" dialog-class="chart-display-settings-modal-dialog" @closemodal="close">
    <div class="chart-display-settings-content">
      <div class="display-setting-row display-setting-row--title">
        <label class="display-setting-label">Заголовок</label>
        <div class="display-setting-control display-setting-control--inline">
          <div class="form-check form-switch mb-0 align-self-center">
            <input id="opt-show-title" v-model="local.showTitle" class="form-check-input" type="checkbox" />
            <label class="form-check-label" for="opt-show-title"></label>
          </div>
          <input v-if="local.showTitle" v-model="local.titleText" type="text" class="form-control form-control-sm display-setting-input" placeholder="Текст заголовка"/>
        </div>
      </div>

      <div class="display-setting-row">
        <label class="display-setting-label">Легенда</label>
        <div class="form-check form-switch mb-0">
          <input id="opt-show-legend" v-model="local.showLegend" class="form-check-input" type="checkbox" />
          <label class="form-check-label" for="opt-show-legend"></label>
        </div>
      </div>

      <div class="display-setting-row">
        <label class="display-setting-label">Тултип</label>
        <div class="form-check form-switch mb-0">
          <input id="opt-show-tooltip" v-model="local.showTooltip" class="form-check-input" type="checkbox" />
          <label class="form-check-label" for="opt-show-tooltip"></label>
        </div>
      </div>

      <div v-if="local.showTooltip" class="display-setting-row">
        <label class="display-setting-label">Сумма в тултипах</label>
        <div class="form-check form-switch mb-0">
          <input id="opt-sum-tooltips" v-model="local.sumInTooltips" class="form-check-input" type="checkbox" />
          <label class="form-check-label" for="opt-sum-tooltips"></label>
        </div>
      </div>

      <div class="display-setting-row display-setting-row--navigator">
        <label class="display-setting-label">Навигатор</label>
        <div class="display-setting-navigator-right flex-grow-1 min-w-0">
          <div class="display-setting-navigator-grid">
            <div class="form-check form-switch mb-0 display-setting-navigator-grid__toggle">
              <input id="opt-show-navigator" v-model="local.showNavigator" class="form-check-input" type="checkbox" />
              <label class="form-check-label" for="opt-show-navigator"></label>
            </div>
            <div v-if="local.showNavigator" class="display-setting-toggle-group display-setting-navigator-grid__group">
              <button type="button" class="display-setting-toggle-btn" :class="{ active: local.navigatorMode === 'all' }" @click="local.navigatorMode = 'all'">Все линии</button>
              <button type="button" class="display-setting-toggle-btn" :class="{ active: local.navigatorMode === 'select' }" @click="local.navigatorMode = 'select'">Выбрать линии</button>
            </div>
            <template v-if="local.showNavigator">
              <div v-if="local.navigatorMode === 'select'" class="display-setting-lines-select display-setting-navigator-grid__lines">
                <SelectBox v-model="local.navigatorLineIds" :options="availableSeries" value-key="label" label-key="label" :include-all-option="false" all-label="Выберите линии" :multiple="true" :searchable="true" search-placeholder="Поиск по полям из Y" size="sm" label=""/>
              </div>
              <div class="display-setting-navigator-grid__period">
                <span class="display-setting-period-label">Период по <br>умолчанию</span>
                <input v-model.number="local.defaultPeriodValue" type="number" min="1" class="form-control form-control-sm display-setting-period-input"/>
                <select v-model="local.defaultPeriodUnit" class="form-select form-select-sm display-setting-period-unit">
                  <option v-for="opt in PERIOD_UNIT_OPTIONS" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>
            </template>
          </div>
        </div>
      </div>

      <div class="modal-actions-buttons">
        <button type="button" class="btn btn-secondary" @click="close">Отменить</button>
        <button type="button" class="btn btn-apply" @click="apply">Применить</button>
      </div>
    </div>
  </ModalCenter>
</template>

<script setup>
import { ref, watch } from 'vue'
import ModalCenter from '@/components/ModalCenter.vue'
import SelectBox from '@/components/SelectBox.vue'

const PERIOD_UNIT_OPTIONS = [
  { value: 'hour', label: 'Час' },
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: 'Квартал' },
  { value: 'year', label: 'Год' },
]

const props = defineProps({
  visible: { type: Boolean, default: false },
  displayOptions: {
    type: Object,
    default: () => ({
      showTitle: true,
      titleText: '',
      showLegend: true,
      showTooltip: true,
      sumInTooltips: true,
      showNavigator: false,
      navigatorMode: 'all',
      navigatorLineIds: [],
      defaultPeriodValue: 1,
      defaultPeriodUnit: 'day',
    }),
  },
  availableSeries: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:visible', 'apply'])

function defaultLocal() {
  return {
    showTitle: props.displayOptions.showTitle !== false,
    titleText: props.displayOptions.titleText ?? '',
    showLegend: props.displayOptions.showLegend !== false,
    showTooltip: props.displayOptions.showTooltip !== false,
    sumInTooltips: props.displayOptions.sumInTooltips !== false,
    showNavigator: props.displayOptions.showNavigator === true,
    navigatorMode: props.displayOptions.navigatorMode ?? 'all',
    navigatorLineIds: Array.isArray(props.displayOptions.navigatorLineIds) ? [...props.displayOptions.navigatorLineIds] : [],
    defaultPeriodValue: Math.max(1, Number(props.displayOptions.defaultPeriodValue) || 1),
    defaultPeriodUnit: props.displayOptions.defaultPeriodUnit ?? 'day',
  }
}

const local = ref(defaultLocal())

function syncFromProps() {
  if (!props.visible) return
  local.value = {
    showTitle: props.displayOptions.showTitle !== false,
    titleText: props.displayOptions.titleText ?? '',
    showLegend: props.displayOptions.showLegend !== false,
    showTooltip: props.displayOptions.showTooltip !== false,
    sumInTooltips: props.displayOptions.sumInTooltips !== false,
    showNavigator: props.displayOptions.showNavigator === true,
    navigatorMode: props.displayOptions.navigatorMode ?? 'all',
    navigatorLineIds: Array.isArray(props.displayOptions.navigatorLineIds) ? [...props.displayOptions.navigatorLineIds] : [],
    defaultPeriodValue: Math.max(1, Number(props.displayOptions.defaultPeriodValue) || 1),
    defaultPeriodUnit: props.displayOptions.defaultPeriodUnit ?? 'day',
  }
}

watch(
  () => [props.visible, props.displayOptions],
  () => {
    if (props.visible) syncFromProps()
  },
  { immediate: true }
)

function close() {
  emit('update:visible', false)
}

function apply() {
  emit('apply', {
    showTitle: local.value.showTitle,
    titleText: local.value.titleText ?? '',
    showLegend: local.value.showLegend,
    showTooltip: local.value.showTooltip,
    sumInTooltips: local.value.sumInTooltips,
    showNavigator: local.value.showNavigator,
    navigatorMode: local.value.navigatorMode,
    navigatorLineIds: [...(local.value.navigatorLineIds || [])],
    defaultPeriodValue: Math.max(1, Number(local.value.defaultPeriodValue) || 1),
    defaultPeriodUnit: local.value.defaultPeriodUnit ?? 'day',
  })
  close()
}
</script>

<style lang="scss" scoped>
.chart-display-settings-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.display-setting-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  &--navigator {
    align-items: flex-start;
  }
}

.display-setting-navigator-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;

  &__toggle {
    grid-column: 1;
  }

  &__group {
    grid-column: 2;
  }

  &__full {
    grid-column: 1 / -1;
  }

  &__lines {
    grid-column: 2;
    min-width: 0;
  }

  &__period {
    grid-column: 2;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: nowrap;

    .display-setting-period-label {
      font-size: 0.875rem;
      color: var(--color-secondary-text);
      flex-shrink: 0;
    }
  }
}

.display-setting-label {
  margin: 0;
  min-width: 160px;
  width: 160px;
  flex-shrink: 0;
  font-size: 0.875rem;
  color: var(--color-primary-text);
}

.display-setting-control {
  flex: 1;
  min-width: 0;

  &--inline {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: nowrap;

    .display-setting-input {
      flex: 1;
      min-width: 120px;
    }
  }
}

.display-setting-row--title {
  flex-wrap: nowrap;
}

.display-setting-input {
  min-width: 160px;
  max-width: 280px;
}

.display-setting-toggle-group {
  display: inline-flex;
  align-items: center;
  gap: 0;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--color-secondary-background);
  width: max-content;

  &.display-setting-navigator-grid__group {
    width: 100%;
    min-width: 0;

    .display-setting-toggle-btn {
      flex: 1;
      min-width: 0;
    }
  }

  .display-setting-toggle-btn {
    padding: 5px 14px;
    font-size: 0.875rem;
    line-height: 1.25;
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

.display-setting-lines-select {
  min-width: 0;
  box-shadow: none;

  :deep(.select-trigger) {
    min-height: 31px;
    height: 31px;
    box-shadow: none;
  }
}

.display-setting-period-input {
  width: 4rem;
}

.display-setting-period-unit {
  width: auto;
  min-width: 120px;
}

.modal-actions-buttons {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-top: 12px;
  border-top: 1px solid var(--color-secondary-background);
  justify-content: flex-end;
}

.btn-secondary{
  background-color: var(--color-primary-background);
  border-color: var(--color-primary-background);
  box-shadow: none;

  &:hover:not(:disabled) {
    background-color: var(--color-hover-background);
  }
}

.btn-apply {
  background-color: #0b5ed7;
  color: white;
  border-radius: 6px;

  &:hover:not(:disabled) {
    background-color: #0a4b9a;
  }
}

.chart-display-settings-content {
  :deep(.form-check-input:checked) {
    background-color: #0b5ed7;
    border-color: #0b5ed7;
  }
}

:deep(.chart-display-settings-modal-dialog) {
  max-width: 720px;
}
</style>