<template>
  <div v-if="visible" class="modal-backdrop fade show" @click="close"></div>
  <ModalCenter v-if="visible" modal-id="chartDisplaySettingsModal" title="Настройки чарта" custom-class="show d-block" dialog-class="chart-display-settings-modal-dialog" @closemodal="close">
    <div class="chart-display-settings-content">
      <!-- Индикатор: режим заголовка (Название поля / Вручную / Скрыть), инпут только при Вручную -->
      <template v-if="chartTypeNorm === 'indicator'">
        <div class="display-setting-row">
          <label class="display-setting-label">Заголовок</label>
          <div class="display-setting-toggle-group display-setting-toggle-group--three">
            <button type="button" class="display-setting-toggle-btn" :class="{ active: local.titleMode === 'fieldName' }" @click="local.titleMode = 'fieldName'">Название поля</button>
            <button type="button" class="display-setting-toggle-btn" :class="{ active: local.titleMode === 'manual' }" @click="local.titleMode = 'manual'">Вручную</button>
            <button type="button" class="display-setting-toggle-btn" :class="{ active: local.titleMode === 'hide' }" @click="local.titleMode = 'hide'">Скрыть</button>
          </div>
        </div>
        <div v-if="local.titleMode === 'manual'" class="display-setting-row">
          <label class="display-setting-label"></label>
          <input v-model="local.titleText" type="text" class="form-control form-control-sm display-setting-input" placeholder="Например: Топ-5 продуктов"/>
        </div>
        <div class="display-setting-row">
          <label class="display-setting-label">Размер</label>
          <div class="display-setting-toggle-group display-setting-toggle-group--four">
            <button type="button" class="display-setting-toggle-btn" :class="{ active: local.indicatorSize === 'xs' }" @click="local.indicatorSize = 'xs'">XS</button>
            <button type="button" class="display-setting-toggle-btn" :class="{ active: local.indicatorSize === 's' }" @click="local.indicatorSize = 's'">S</button>
            <button type="button" class="display-setting-toggle-btn" :class="{ active: local.indicatorSize === 'm' }" @click="local.indicatorSize = 'm'">M</button>
            <button type="button" class="display-setting-toggle-btn" :class="{ active: local.indicatorSize === 'l' }" @click="local.indicatorSize = 'l'">L</button>
          </div>
        </div>
      </template>

      <!-- Остальные типы: общие блоки по флагам -->
      <template v-else>
        <!-- Заголовок (toggle + input) для всех кроме indicator -->
        <div v-if="showBlockTitle" class="display-setting-row display-setting-row--title">
          <label class="display-setting-label">Заголовок</label>
          <div class="display-setting-control display-setting-control--inline">
            <div class="form-check form-switch mb-0 align-self-center">
              <input :id="'opt-show-title-' + chartTypeNorm" v-model="local.showTitle" class="form-check-input" type="checkbox" />
              <label class="form-check-label" :for="'opt-show-title-' + chartTypeNorm"></label>
            </div>
            <input v-if="local.showTitle" v-model="local.titleText" type="text" class="form-control form-control-sm display-setting-input" placeholder="Например: Топ-5 продуктов"/>
          </div>
        </div>

        <!-- Таблица: размер S/M/L, пагинация, лимит, группировка, итоги, пробелы -->
        <template v-if="chartTypeNorm === 'table'">
          <div class="display-setting-row">
            <label class="display-setting-label">Размер</label>
            <div class="display-setting-toggle-group">
              <button type="button" class="display-setting-toggle-btn" :class="{ active: local.tableSize === 's' }" @click="local.tableSize = 's'">S</button>
              <button type="button" class="display-setting-toggle-btn" :class="{ active: local.tableSize === 'm' }" @click="local.tableSize = 'm'">M</button>
              <button type="button" class="display-setting-toggle-btn" :class="{ active: local.tableSize === 'l' }" @click="local.tableSize = 'l'">L</button>
            </div>
          </div>
          <div class="display-setting-row">
            <label class="display-setting-label">Пагинация</label>
            <div class="form-check form-switch mb-0">
              <input :id="'opt-pagination-' + chartTypeNorm" v-model="local.pagination" class="form-check-input" type="checkbox" />
              <label class="form-check-label" :for="'opt-pagination-' + chartTypeNorm"></label>
            </div>
          </div>
          <div class="display-setting-row">
            <label class="display-setting-label">Лимит</label>
            <input v-model.number="local.limit" type="number" min="1" class="form-control form-control-sm display-setting-input display-setting-input--number"/>
          </div>
          <div class="display-setting-row">
            <label class="display-setting-label">Группировка</label>
            <div class="form-check form-switch mb-0">
              <input :id="'opt-grouping-' + chartTypeNorm" v-model="local.grouping" class="form-check-input" type="checkbox" />
              <label class="form-check-label" :for="'opt-grouping-' + chartTypeNorm"></label>
            </div>
          </div>
          <div class="display-setting-row">
            <label class="display-setting-label">Итоги</label>
            <div class="form-check form-switch mb-0">
              <input :id="'opt-table-totals-' + chartTypeNorm" v-model="local.tableShowTotals" class="form-check-input" type="checkbox" />
              <label class="form-check-label" :for="'opt-table-totals-' + chartTypeNorm"></label>
            </div>
          </div>
          <div class="display-setting-row">
            <label class="display-setting-label">Сохранять пробелы и переносы</label>
            <div class="form-check form-switch mb-0">
              <input :id="'opt-preserve-spaces-' + chartTypeNorm" v-model="local.preserveSpaces" class="form-check-input" type="checkbox" />
              <label class="form-check-label" :for="'opt-preserve-spaces-' + chartTypeNorm"></label>
            </div>
          </div>
        </template>

        <div v-if="showBlockLegend" class="display-setting-row">
          <label class="display-setting-label">Легенда</label>
          <div class="form-check form-switch mb-0">
            <input :id="'opt-show-legend-' + chartTypeNorm" v-model="local.showLegend" class="form-check-input" type="checkbox" />
            <label class="form-check-label" :for="'opt-show-legend-' + chartTypeNorm"></label>
          </div>
        </div>

        <div v-if="showBlockTooltip" class="display-setting-row">
          <label class="display-setting-label">Тултип</label>
          <div class="form-check form-switch mb-0">
            <input :id="'opt-show-tooltip-' + chartTypeNorm" v-model="local.showTooltip" class="form-check-input" type="checkbox" />
            <label class="form-check-label" :for="'opt-show-tooltip-' + chartTypeNorm"></label>
          </div>
        </div>

        <div v-if="showBlockSumInTooltips && local.showTooltip" class="display-setting-row">
          <label class="display-setting-label">Сумма в тултипах</label>
          <div class="form-check form-switch mb-0">
            <input :id="'opt-sum-tooltips-' + chartTypeNorm" v-model="local.sumInTooltips" class="form-check-input" type="checkbox" />
            <label class="form-check-label" :for="'opt-sum-tooltips-' + chartTypeNorm"></label>
          </div>
        </div>

        <div v-if="showBlockStacked" class="display-setting-row">
          <label class="display-setting-label">Накопление</label>
          <div class="form-check form-switch mb-0">
            <input :id="'opt-stacked-' + chartTypeNorm" v-model="local.stacked" class="form-check-input" type="checkbox" />
            <label class="form-check-label" :for="'opt-stacked-' + chartTypeNorm"></label>
          </div>
        </div>

        <div v-if="showBlockDoughnutTotals" class="display-setting-row">
          <label class="display-setting-label">Итоги</label>
          <div class="form-check form-switch mb-0">
            <input :id="'opt-doughnut-totals-' + chartTypeNorm" v-model="local.doughnutShowTotals" class="form-check-input" type="checkbox" />
            <label class="form-check-label" :for="'opt-doughnut-totals-' + chartTypeNorm"></label>
          </div>
        </div>

        <div v-if="showBlockNavigator" class="display-setting-row display-setting-row--navigator">
          <label class="display-setting-label">Навигатор</label>
          <div class="display-setting-navigator-right flex-grow-1 min-w-0">
            <div class="display-setting-navigator-grid">
              <div class="form-check form-switch mb-0 display-setting-navigator-grid__toggle">
                <input :id="'opt-show-navigator-' + chartTypeNorm" v-model="local.showNavigator" class="form-check-input" type="checkbox" />
                <label class="form-check-label" :for="'opt-show-navigator-' + chartTypeNorm"></label>
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
      </template>

      <div class="modal-actions-buttons">
        <button type="button" class="btn btn-secondary" @click="close">Отменить</button>
        <button type="button" class="btn btn-apply" @click="apply">Применить</button>
      </div>
    </div>
  </ModalCenter>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
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

const TYPES_WITH_NAVIGATOR = ['line', 'area', 'combined']
const TYPES_WITH_SUM_IN_TOOLTIPS = ['bar', 'barHorizontal', 'line', 'area', 'combined']
const TYPES_WITH_LEGEND = ['bar', 'barHorizontal', 'line', 'area', 'pie', 'doughnut', 'scatter', 'radar', 'combined', 'funnel', 'treemap']
const TYPES_WITH_TOOLTIP = ['bar', 'barHorizontal', 'line', 'area', 'pie', 'doughnut', 'scatter', 'radar', 'heatmap', 'combined', 'funnel', 'gauge', 'treemap']

const props = defineProps({
  visible: { type: Boolean, default: false },
  chartType: { type: String, default: '' },
  displayOptions: {
    type: Object,
    default: () => ({}),
  },
  availableSeries: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:visible', 'apply'])

const chartTypeNorm = computed(() => (props.chartType || '').toLowerCase().trim() || 'bar')

const showBlockTitle = computed(() => chartTypeNorm.value !== 'indicator')
const showBlockLegend = computed(() => TYPES_WITH_LEGEND.includes(chartTypeNorm.value))
const showBlockTooltip = computed(() => TYPES_WITH_TOOLTIP.includes(chartTypeNorm.value))
const showBlockSumInTooltips = computed(() => TYPES_WITH_SUM_IN_TOOLTIPS.includes(chartTypeNorm.value))
const showBlockStacked = computed(() => chartTypeNorm.value === 'area')
const showBlockDoughnutTotals = computed(() => chartTypeNorm.value === 'doughnut')
const showBlockNavigator = computed(() => TYPES_WITH_NAVIGATOR.includes(chartTypeNorm.value))

function getOpt(opts, key, fallback) {
  if (!opts || typeof opts !== 'object') return fallback
  const v = opts[key]
  return v !== undefined && v !== null ? v : fallback
}

function defaultLocal() {
  const o = props.displayOptions
  return {
    showTitle: getOpt(o, 'showTitle', true) !== false,
    titleText: o?.titleText ?? '',
    showLegend: getOpt(o, 'showLegend', true) !== false,
    showTooltip: getOpt(o, 'showTooltip', true) !== false,
    sumInTooltips: getOpt(o, 'sumInTooltips', true) !== false,
    showNavigator: getOpt(o, 'showNavigator', false) === true,
    navigatorMode: o?.navigatorMode ?? 'all',
    navigatorLineIds: Array.isArray(o?.navigatorLineIds) ? [...o.navigatorLineIds] : [],
    defaultPeriodValue: Math.max(1, Number(o?.defaultPeriodValue) || 1),
    defaultPeriodUnit: o?.defaultPeriodUnit ?? 'day',
    tableSize: o?.tableSize ?? 'm',
    pagination: getOpt(o, 'pagination', true) !== false,
    limit: Math.max(1, Number(o?.limit) || 100),
    grouping: getOpt(o, 'grouping', true) !== false,
    tableShowTotals: getOpt(o, 'tableShowTotals', false) === true,
    preserveSpaces: getOpt(o, 'preserveSpaces', false) === true,
    stacked: getOpt(o, 'stacked', false) === true,
    doughnutShowTotals: getOpt(o, 'doughnutShowTotals', false) === true,
    titleMode: o?.titleMode ?? 'fieldName',
    indicatorSize: o?.indicatorSize ?? 's',
  }
}

const local = ref(defaultLocal())

function syncFromProps() {
  if (!props.visible) return
  local.value = defaultLocal()
}

watch(
  () => [props.visible, props.displayOptions, props.chartType],
  () => {
    if (props.visible) syncFromProps()
  },
  { immediate: true }
)

function close() {
  emit('update:visible', false)
}

function apply() {
  const l = local.value
  emit('apply', {
    showTitle: l.showTitle,
    titleText: l.titleText ?? '',
    showLegend: l.showLegend,
    showTooltip: l.showTooltip,
    sumInTooltips: l.sumInTooltips,
    showNavigator: l.showNavigator,
    navigatorMode: l.navigatorMode,
    navigatorLineIds: [...(l.navigatorLineIds || [])],
    defaultPeriodValue: Math.max(1, Number(l.defaultPeriodValue) || 1),
    defaultPeriodUnit: l.defaultPeriodUnit ?? 'day',
    tableSize: l.tableSize ?? 'm',
    pagination: l.pagination,
    limit: Math.max(1, Number(l.limit) || 100),
    grouping: l.grouping,
    tableShowTotals: l.tableShowTotals,
    preserveSpaces: l.preserveSpaces,
    stacked: l.stacked,
    doughnutShowTotals: l.doughnutShowTotals,
    titleMode: l.titleMode ?? 'fieldName',
    indicatorSize: l.indicatorSize ?? 's',
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

  &--number {
    max-width: 8rem;
  }
}

.display-setting-toggle-group {
  display: inline-flex;
  align-items: center;
  gap: 0;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--color-secondary-background);
  width: max-content;

  &--three .display-setting-toggle-btn,
  &--four .display-setting-toggle-btn {
    min-width: 0;
  }

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
