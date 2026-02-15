<template>
  <div :class="['body-grid', { 'no-fields': !selectedChartType, fullscreen: isFullScreen }]">
    <div class="datasets sectors border-elements elements-color">
      <h5 class="m-0 me-2">Датасет</h5>
      <div class="dataset-select">
        <SelectBox :model-value="selectedDatasetId" @update:model-value="emit('update:selectedDatasetId', $event)" :options="datasets" value-key="id" label-key="name" :include-all-option="false" all-label="Выбрать датасет" :disabled="datasetsLoading" size="sm">
          <template #selected="{ label }">
            <span class="d-flex align-items-center gap-2 flex-grow-1 min-w-0 overflow-hidden"><Database class="flex-shrink-0" :size="16" /><span class="text-truncate min-w-0">{{ label }}</span></span>
          </template>
          <template #option="{ label }"><span class="d-flex align-items-center gap-2"><Database class="flex-shrink-0" :size="16" />{{ label }}</span></template>
        </SelectBox>
      </div>
    </div>
    <div class="diagramtype sectors border-elements elements-color">
      <div class="chart-page__diagram-header d-flex align-items-center gap-2 mb-0 me-2">
        <h5 class="m-0">Тип диаграммы</h5>
        <button v-if="selectedChartType" type="button" class="chart-page__settings-btn" title="Настройки графика" @click="emit('open-display-settings')">
          <Settings class="chart-page__settings-icon" :size="16" />
        </button>
      </div>
      <div class="chart-type-select">
        <SelectBox :model-value="selectedChartType" @update:model-value="emit('update:selectedChartType', $event)" :options="CHART_TYPE_OPTIONS" value-key="value" label-key="label" :include-all-option="false" all-label="Выберите тип диаграммы" :disabled="!selectedDataset" size="sm">
          <template #selected="{ value, label }">
            <span class="d-flex align-items-center gap-2 flex-grow-1 min-w-0">
              <span class="d-flex align-items-center flex-shrink-0" :style="{ color: getChartTypeColor(value ?? selectedChartType) }">
                <component :is="getChartTypeIcon(value ?? selectedChartType)" :size="16" />
              </span>
              <span class="text-truncate">{{ label }}</span>
            </span>
          </template>
          <template #option="{ value, label }">
            <span class="d-flex align-items-center gap-2">
              <span class="d-flex align-items-center flex-shrink-0" :style="{ color: getChartTypeColor(value) }">
                <component :is="getChartTypeIcon(value)" :size="16" />
              </span>
              {{ label }}
            </span>
          </template>
        </SelectBox>
      </div>
    </div>
    <div class="fields sectors body-settings border-elements elements-color" v-if="!isFullScreen && selectedChartType">
      <ChartSettingsFields :setting-types="settingTypes" :selected-fields="selectedFields" :fields-modal-open-for-key="fieldsModalOpenForKey" :chart-type="selectedChartType" :sort-desc="sortDesc" @add-field-click="(event, key) => emit('add-field-click', event, key)" @remove-field="(field, type) => emit('remove-field', field, type)" @edit-filter="emit('edit-filter', $event)" @open-field-settings="emit('open-field-settings', $event)" @open-formula="emit('open-formula', $event)" @open-section-settings="emit('open-section-settings', $event)" @toggle-sort-direction="emit('toggle-sort-direction')"/>
    </div>
    <div class="indicators sectors border-elements elements-color">
      <h5 class="m-0 me-2">Показатели</h5>
      <div class="sectors-body"><DatasetIndicators :dataset="selectedDataset" :fields="indicators" @open-formula="(e) => emit('open-formula', e)" @duplicate="(f) => emit('duplicate-indicator', f)" @remove-duplicate="(f) => emit('remove-duplicate-indicator', f)" /></div>
    </div>
    <div class="measures sectors border-elements elements-color">
      <h5 class="m-0 me-2">Измерения</h5>
      <div class="sectors-body">
        <DatasetMeasures :dataset="selectedDataset" :fields="measures" @open-formula="(e) => emit('open-formula', { ...e, fieldType: 'measure' })" @duplicate="(f) => emit('duplicate-measure', f)" @remove-duplicate="(f) => emit('remove-duplicate-measure', f)"/>
      </div>
    </div>
    <div class="parameters settings sectors border-elements elements-color">
      <h5 class="m-0 me-2">Параметры</h5>
      <div class="sectors-body">
        <DatasetSettings :dataset="selectedDataset" :fields="parameters" @edit-parameter="(f) => emit('edit-parameter', f)"/>
      </div>
    </div>
    <div class="body-chart border-elements elements-color" :class="{ fullscreen: isFullScreen }">
      <ChartArea :dataset="datasetRows" :chart-type="selectedChartType" :fields="fieldsForChart" :key="selectedChartType" :settings="settingTypes" :display-options="chartDisplayOptions" :data-loading="datasetRowsLoading"/>
    </div>
  </div>
</template>

<script setup>
import { Database, Settings } from 'lucide-vue-next'
import { getChartTypeIcon, getChartTypeColor, CHART_TYPE_OPTIONS } from '@/core/bi/Charts/js/chartTypeIcons.js'
import SelectBox from '@/components/SelectBox.vue'
import DatasetIndicators from './components/DatasetIndicators.vue'
import DatasetMeasures from './components/DatasetMeasures.vue'
import DatasetSettings from './components/DatasetSettings.vue'
import ChartSettingsFields from './components/ChartSettingsFields.vue'
import ChartArea from './ChartArea.vue'

defineProps({
  selectedDatasetId: {
    type: [String, Number],
    default: null,
  },
  selectedChartType: {
    type: String,
    default: '',
  },
  datasets: {
    type: Array,
    default: () => [],
  },
  datasetsLoading: {
    type: Boolean,
    default: false,
  },
  selectedDataset: {
    type: Object,
    default: null,
  },
  settingTypes: {
    type: Array,
    default: () => [],
  },
  selectedFields: {
    type: Object,
    default: () => ({}),
  },
  fieldsModalOpenForKey: {
    type: String,
    default: null,
  },
  indicators: {
    type: Array,
    default: () => [],
  },
  measures: {
    type: Array,
    default: () => [],
  },
  parameters: {
    type: Array,
    default: () => [],
  },
  datasetRows: {
    type: Array,
    default: () => [],
  },
  fieldsForChart: {
    type: Object,
    default: () => ({}),
  },
  chartDisplayOptions: {
    type: Object,
    default: () => ({}),
  },
  datasetRowsLoading: {
    type: Boolean,
    default: false,
  },
  isFullScreen: {
    type: Boolean,
    default: false,
  },
  sortDesc: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'toggle-sort-direction',
  'update:selectedDatasetId',
  'update:selectedChartType',
  'open-display-settings',
  'add-field-click',
  'remove-field',
  'edit-filter',
  'open-field-settings',
  'open-formula',
  'open-section-settings',
  'duplicate-indicator',
  'remove-duplicate-indicator',
  'duplicate-measure',
  'remove-duplicate-measure',
  'edit-parameter',
])
</script>

<style scoped lang="scss">
.body-grid {
  display: grid;
  grid-template-columns: minmax(14rem, 17.5rem) minmax(14rem, 1fr) minmax(14rem, 1fr) minmax(14rem, 1fr);
  grid-template-rows: 6rem 6rem auto;
  grid-template-areas:
    'datasets   indicators measures parameters'
    'diagramtype indicators measures parameters'
    'fields     chart      chart    chart';
  gap: 20px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.body-grid.fullscreen {
  grid-template-areas:
    'chart chart chart chart'
    'chart chart chart chart'
    'chart chart chart chart';

  .body-chart {
    grid-column: 1 / -1;
    grid-row: 1 / -1;
    max-height: none;
    overflow: visible;
  }

  .datasets,
  .diagramtype,
  .fields,
  .indicators,
  .measures,
  .parameters {
    display: none;
  }
}

.body-grid .body-chart {
  grid-column: 2 / 5;
}

.body-grid.no-fields .body-chart {
  grid-column: 1 / -1;
}

.dataset-select :deep(.select-trigger),
.chart-type-select :deep(.select-trigger) {
  min-height: 31px;
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;
}

.datasets {
  grid-area: datasets;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: stretch;
}

.chart-page__diagram-header {
  align-items: center;
  line-height: 1;

  h5 {
    line-height: inherit;
  }
}

.chart-page__settings-btn {
  background: none;
  border: none;
  padding: 4px 2px 0 2px;
  height: 20px;
  min-width: 20px;
  box-sizing: border-box;
  cursor: pointer;
  display: inline-flex;
  align-items: flex-start;
  justify-content: center;
  color: var(--color-primary-text);
  transition: color 0.3s ease;
  flex-shrink: 0;
  line-height: 1;

  &:hover {
    color: var(--color-accent);
    .chart-page__settings-icon {
      transform: rotate(180deg);
    }
  }
}

.chart-page__settings-icon {
  transition: transform 0.5s ease;
  transform: rotate(0deg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.diagramtype {
  grid-area: diagramtype;
}

.fields {
  grid-area: fields;
  align-self: start;
}

.indicators {
  grid-area: indicators;
  overflow: hidden;
  min-width: 0;
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
}

.measures {
  grid-area: measures;
  min-width: 0;
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.parameters {
  grid-area: parameters;
  min-width: 0;
  max-width: 100%;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.body-chart {
  grid-area: chart;
  flex: 1 1 0%;
  min-height: 360px;
  max-height: min(800px, 75vh);
  overflow-x: hidden;
  overflow-y: visible;
  width: 100%;
  padding: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.sectors {
  padding: 15px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

.sectors-body {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.diagramtype,
.settings,
.indicators,
.measures {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.body-settings {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 20px;
  padding: 15px;
  min-height: 5rem;
  flex-shrink: 0;
  width: 17.5rem;
}

.border-elements {
  border-radius: 8px;
}

.elements-color {
  background-color: var(--color-primary-background);
}

.dataset-select {
  width: 100%;
  min-width: 0;
}

.dataset-select :deep(.select-box) {
  width: 100%;
}

.dataset-select :deep(.select-trigger > span) {
  min-width: 0;
  overflow: hidden;
}

@media (max-width: 1400px) {
  .body-grid {
    grid-template-columns: minmax(12rem, 15rem) minmax(12rem, 1fr) minmax(12rem, 1fr) minmax(12rem, 1fr);
    gap: 15px;
  }
}

@media (max-width: 1200px) {
  .body-grid {
    grid-template-columns: minmax(10rem, 13rem) minmax(10rem, 1fr) minmax(10rem, 1fr) minmax(10rem, 1fr);
    gap: 12px;
  }
}

@media (max-width: 992px) {
  .body-grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      'datasets'
      'diagramtype'
      'indicators'
      'measures'
      'parameters'
      'fields'
      'chart';
    gap: 20px;
  }

  .body-grid .body-chart {
    grid-column: 1;
  }

  .body-grid.no-fields .body-chart {
    grid-column: 1;
  }
}
</style>