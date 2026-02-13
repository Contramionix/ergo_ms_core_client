<template>
    <div class="page-body">
        <div class="body-header border-elements elements-color">
            <div class="header-label-icon">
                <span class="chart-type-icon-header" :style="chartTypeIconStyle">
                    <component :is="chartTypeIconComponent" />
                </span>
                <div style="overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
                    <h4 class="header-label" style="margin-bottom: 3px;">{{ chartName }}</h4>
                </div>
            </div>
            <div class="header-label-buttons">
                <button v-if="isEditMode && datasetRows && datasetRows.length > 0 && ollamaAvailable" class="btn text-white btn-sm btn-success"  @click="runChartAnalysis" style="display: flex; gap: 5px; justify-content: center; align-items: center;">
                    <BrainCircuit :size="18" />Интеллектуальный анализ
                </button>
                <button class="btn btn-sm fw-bold btn-full-screen" :class="{ active: isFullScreen }" style="display: flex; gap: 5px; justify-content: center; align-items: center;" @click="toggleFullScreen">
                    <Maximize />На весь экран
                </button>
                <button class="btn btn-sm btn-primary" :disabled="(isEditMode && loading) || !chartRequiredFieldsFilled || !isChartDirty" @click="onSaveClick">{{ isEditMode ? 'Сохранить изменения' : 'Создать чарт' }}</button>
            </div>
        </div>
        <div :class="['body-grid', { 'no-fields': !selectedChartType, fullscreen: isFullScreen }]">
            <div class="datasets sectors border-elements elements-color">
                <h5 class="m-0 me-2">Датасет</h5>
                <div class="dataset-select">
                    <SelectBox v-model="selectedDatasetId" :options="datasets" value-key="id" label-key="name" :include-all-option="false" all-label="Выбрать датасет" :disabled="datasetsLoading" size="sm">
                        <template #selected="{ label }">
                            <span class="d-flex align-items-center gap-2 flex-grow-1 min-w-0 overflow-hidden">
                                <Database class="flex-shrink-0" :size="16" /><span class="text-truncate min-w-0">{{ label }}</span>
                            </span>
                        </template>
                        <template #option="{ label }">
                            <span class="d-flex align-items-center gap-2">
                                <Database class="flex-shrink-0" :size="16" />{{ label }}
                            </span>
                        </template>
                    </SelectBox>
                </div>
            </div>
            <div class="diagramtype sectors border-elements elements-color">
                <h5 class="m-0 me-2">Тип диаграммы</h5>
                <div class="chart-type-select">
                <SelectBox v-model="selectedChartType" :options="CHART_TYPE_OPTIONS" value-key="value" label-key="label" :include-all-option="false" all-label="Выберите тип диаграммы" :disabled="!selectedDataset" size="sm">
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
                <ChartSettingsFields :setting-types="settingTypes" :selected-fields="selectedFields" @add-field-click="openFieldsModal" @remove-field="removeField" @edit-filter="openFilterModalForEdit" @open-field-settings="openFieldSettingsModal"/>
            </div>
            <div class="indicators sectors border-elements elements-color">
                <h5 class="m-0 me-2">Показатели</h5>
                <div class="sectors-body"><DatasetIndicators :dataset="selectedDataset" :fields="indicators" /></div>
            </div>
            <div class="measures sectors border-elements elements-color">
                <h5 class="m-0 me-2">Измерения</h5>
                <div class="sectors-body"><DatasetMeasures :dataset="selectedDataset" /></div>
            </div>
            <div class="parameters settings sectors border-elements elements-color">
                <h5 class="m-0 me-2">Параметры</h5>
                <div class="sectors-body"><DatasetSettings :dataset="selectedDataset" /></div>
            </div>
            <div class="body-chart border-elements elements-color" :class="{ fullscreen: isFullScreen }">
                <ChartArea :dataset="datasetRows" :chart-type="selectedChartType" :fields="fieldsForChart" :key="selectedChartType" :settings="settingTypes" :data-loading="datasetRowsLoading" />
            </div>
        </div>
    </div>

    <transition name="fade-slide" appear>
        <div v-if="isFieldsModalVisible" class="tooltip-panel-fields" :style="{ left: fieldsModalPosition.x + 'px', top: fieldsModalPosition.y + 'px', position: 'fixed', zIndex: 1000 }" ref="fieldsModalRef">
            <ChartFields :fields="indicators" :selected="selectedForModal" :allowed-types="currentAllowedTypes" :measures-in-chart="measuresInChart" :current-slot-config="currentSlotConfig" @select="handleFieldSelect" />
        </div>
    </transition>
    <ChartNameDialog v-if="isSaveModalVisible" :visible="isSaveModalVisible" v-model="chartName" @update:visible="isSaveModalVisible = $event" @saved="onChartNameSaved" />
    <ChartSettingsFilterModal :visible="isFilterModalVisible" :field="filterModalField" :dataset-id="selectedDataset?.id ?? null" :initial-filter="filterModalInitialFilter" @update:visible="isFilterModalVisible = $event; if (!$event) filterModalField = null" @apply="onFilterModalApply"/>
    <ChartSettingsFieldModal :visible="fieldSettingsModalVisible" :field="fieldSettingsModalField" @update:visible="onFieldSettingsModalVisibleChange" @apply="onFieldSettingsApply"/>
</template>

<script setup>
import { Maximize, Database, BrainCircuit } from 'lucide-vue-next'
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { getChartTypeIcon, getChartTypeColor, CHART_TYPE_OPTIONS } from '@/core/bi/Charts/js/chartTypeIcons.js'
import SelectBox from '@/components/SelectBox.vue'

import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'

import DatasetIndicators from '@/core/bi/Charts/components/DatasetIndicators.vue'
import DatasetMeasures from '@/core/bi/Charts/components/DatasetMeasures.vue'
import DatasetSettings from '@/core/bi/Charts/components/DatasetSettings.vue'
import ChartFields from '@/core/bi/Charts/ChartFields.vue'
import ChartArea from '@/core/bi/Charts/ChartArea.vue'
import ChartNameDialog from '@/core/bi/Charts/components/ChartNameDialog.vue'
import ChartSettingsFields from '@/core/bi/Charts/components/ChartSettingsFields.vue'
import ChartSettingsFilterModal from '@/core/bi/Charts/components/ChartSettingsFilterModal.vue'
import ChartSettingsFieldModal from '@/core/bi/Charts/components/ChartSettingsFieldModal.vue'

import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import { chartSettingsConfig } from '@/core/bi/MainPage/Sidebar/components/js/chartSettingsConfig.js'
import chartService from '@/core/bi/MainPage/Sidebar/components/js/chartService.js'
import { isVirtualMeasureField } from '@/core/bi/Charts/js/measureVirtualFields.js'
import { useAssistant } from '@/core/ai-assistant/js/assistantService.js'
import { biClient } from '@/core/ai-assistant/bi/js/bi-client.js'
import { expandDateRangeFilter } from '@/core/bi/Charts/components/js/chartDateFilterUtils.js'

const toast = useToast()
const isFullScreen = ref(false)
const assistant = useAssistant()
const ollamaAvailable = ref(false)

const isFieldsModalVisible = ref(false)
const fieldsModalPosition = ref({ x: 0, y: 0 })
const fieldsModalRef = ref(null)

const isFilterModalVisible = ref(false)
const filterModalField = ref(null)

const fieldSettingsModalVisible = ref(false)
const fieldSettingsModalField = ref(null)
const fieldSettingsModalSettingKey = ref(null)

const filterModalInitialFilter = computed(() =>
  filterModalField.value?.filter ?? null
)

const selectedDatasetId = ref(null)
const selectedDataset = computed(() =>
  datasets.value.find(d => String(d.id) === String(selectedDatasetId.value)) ?? null
)
const selectedChartType = ref('')

const indicators = ref([])
const currentSetting = ref('')

const datasetRows = ref([])
const datasetRowsLoading = ref(false)

const currentAllowedTypes = ref(null)
const originalChart = ref({})
const originalSelectedFields = ref({})

const router = useRouter()
const route = useRoute()
const chartId = computed(() => route.params.id)
const loading = ref(false)
const isSaveModalVisible = ref(false)
const isEditMode = computed(() => !!route.params.id)
const chartData = ref({})
const chartName = ref('Новая диаграмма')

const datasets = ref([])
const datasetsLoading = ref(false)
const skipNextDatasetWatch = ref(false)
const skipNextSelectedFieldsWatch = ref(false)

const settingTypes = computed(() =>
    chartSettingsConfig[selectedChartType.value] || []
)

const chartTypeIconComponent = computed(() =>
  getChartTypeIcon(selectedChartType.value)
)

const chartTypeIconStyle = computed(() => {
  const color = getChartTypeColor(selectedChartType.value)
  return color ? { color } : {}
})

const selectedFields = ref({})

const EMPTY_SELECTED_FIELDS = { y: [], x: [], color: [], sort: [], labels: [], filters: [] }

const REQUIRED_FIELDS_BY_CHART_TYPE = {
    line: ['x', 'y'],
    bar: ['x', 'y'],
    pie: ['category', 'indicators'],
    doughnut: ['category', 'indicators'],
    scatter: ['x', 'y'],
    radar: ['category', 'indicators'],
    heatmap: ['x', 'y', 'value'],
    area: ['x', 'y'],
    barHorizontal: ['x', 'y'],
    combined: ['x', 'y'],
    funnel: ['category', 'value'],
    gauge: ['value'],
    treemap: ['category', 'value'],
    indicator: ['value'],
    table: ['columns'],
}

function cloneParams(params) {
    return JSON.parse(JSON.stringify(params ?? {}))
}

function getDatasetId(datasetField) {
    if (datasetField == null) return null
    return typeof datasetField === 'object' ? datasetField.id : datasetField
}

function buildOriginalChart(data) {
    return {
        name: data.name,
        datasetId: getDatasetId(data.dataset),
        chart_type: data.chart_type,
        engine: data.engine,
        params: cloneParams(data.params),
    }
}

async function fetchDatasetRows(datasetId, params) {
    const { data } = await chartService.getDatasetRowsAgg(datasetId, filterParamsForApi(params ?? selectedFields.value))
    datasetRows.value = data
}

async function loadDatasetColumnsAndRows(datasetId, params) {
    if (!datasetId) return
    try {
        const { data: columnsResp } = await chartService.getColumns(datasetId)
        indicators.value = Array.isArray(columnsResp?.columns) ? columnsResp.columns : []
        await fetchDatasetRows(datasetId, params)
    } catch {
        // Игнорируем ошибку
    }
}

function filterParamsForApi(params) {
  if (!params || typeof params !== 'object') return params ?? {}
  const filtered = {}
  for (const [key, arr] of Object.entries(params)) {
    if (!Array.isArray(arr)) {
      filtered[key] = arr
      continue
    }
    let cleaned = arr.filter(f => !isVirtualMeasureField(f))

    if (key === 'filters') {
      const expanded = []
      cleaned.forEach((f) => {
        const op = f?.filter?.op ?? f?.op
        if (op === 'date_range') {
          const parts = expandDateRangeFilter(f)
          if (Array.isArray(parts) && parts.length) {
            expanded.push(...parts)
          }
        } else {
          expanded.push(f)
        }
      })
      cleaned = expanded
    }

    if (cleaned.length || key === 'filters') {
      filtered[key] = cleaned
    }
  }
  return filtered
}

const fieldsForChart = computed(() => filterParamsForApi(selectedFields.value))

const measuresInChart = computed(() => {
  const f = selectedFields.value
  return ['y', 'y2', 'indicators', 'value'].flatMap(key => (f[key] ?? []).filter(Boolean))
})

const currentSlotConfig = computed(() =>
  settingTypes.value.find(s => s.key === currentSetting.value) ?? null
)

watch(chartData, d => { chartName.value = d?.name || 'Новая диаграмма' }, { immediate: true })

async function onSelectedDatasetChange(ds) {
    selectedFields.value = { ...EMPTY_SELECTED_FIELDS }
    await loadDatasetColumnsAndRows(ds?.id, selectedFields.value)
}

watch(selectedDataset, async (newDs, oldDs) => {
    if (skipNextDatasetWatch.value) return
    if (newDs?.id === oldDs?.id) return
    await onSelectedDatasetChange(newDs)
})

const chartRequiredFieldsFilled = computed(() => {
    if (!selectedDataset.value || !selectedChartType.value) return false
    const required = REQUIRED_FIELDS_BY_CHART_TYPE[selectedChartType.value]
    if (!required?.length) return false
    return required.every(key => selectedFields.value[key]?.length > 0)
})

function onSaveClick() {
    if (isEditMode.value) {
        onChartNameSaved({ name: chartName.value })
    } else {
        isSaveModalVisible.value = true
    }
}

async function onChartNameSaved({ name }) {
    chartName.value = name
    const payload = {
        name,
        dataset: selectedDataset.value.id,
        chart_type: selectedChartType.value,
        engine: 'echarts',
        params: cloneParams(selectedFields.value),
        options: {}
    }
    try {
        if (isEditMode.value) {
            const { data: updated } = await chartService.updateChart(chartId.value, payload)
            chartData.value = updated
            originalChart.value = buildOriginalChart(updated)
            originalSelectedFields.value = cloneParams(selectedFields.value)
            toast.success('Изменения сохранены')
        } else {
            const { data } = await chartService.createChart(payload)
            if (data && data.id) {
                router.push({ name: 'ChartPage', params: { id: data.id } })
            }
        }
    } catch {
        toast.error('Не удалось сохранить изменения')
    }
    isSaveModalVisible.value = false
}

async function fetchChartIfEditing() {
    if (!chartId.value) return
    loading.value = true
    try {
        await fetchDatasetsOnce()
        const { data } = await chartService.getChart(chartId.value)
        chartData.value = data
        const dsObj = typeof data.dataset === 'object' && data.dataset !== null
            ? data.dataset
            : data.dataset ? (await chartService.getDataset(data.dataset)).data : null
        if (dsObj && !datasets.value.some(d => String(d.id) === String(dsObj.id))) {
            datasets.value = [...datasets.value, dsObj]
        }
        skipNextDatasetWatch.value = true
        selectedDatasetId.value = dsObj?.id ?? null

        selectedChartType.value = String(data.chart_type ?? '')
        skipNextSelectedFieldsWatch.value = true
        selectedFields.value = cloneParams(data.params)
        originalSelectedFields.value = cloneParams(selectedFields.value)

        await loadDatasetColumnsAndRows(dsObj?.id, selectedFields.value)
        originalChart.value = buildOriginalChart(data)
    } catch {
        // Игнорируем ошибку
    } finally {
        skipNextDatasetWatch.value = false
        skipNextSelectedFieldsWatch.value = false
        loading.value = false
    }
}

function runChartAnalysis() {
    if (chartId.value) assistant.openAndAnalyzeChart(chartId.value)
}

async function checkOllamaAvailability() {
    if (!isEditMode.value) return

    const status = await biClient.checkOllamaStatus()
    ollamaAvailable.value = status.available
}

const selectedForModal = computed(() => selectedFields.value[currentSetting.value] || [])

const GAP = 6

function clampFloatingPosition(anchorRect, panelWidth, panelHeight) {
    const vw = window.innerWidth
    const vh = window.innerHeight
    let x = anchorRect.left
    let y = anchorRect.bottom + GAP
    if (x + panelWidth > vw) x = Math.max(0, vw - panelWidth - GAP)
    if (x < 0) x = GAP
    if (y + panelHeight > vh) {
        const spaceAbove = anchorRect.top
        if (spaceAbove >= panelHeight + GAP) y = anchorRect.top - panelHeight - GAP
        else y = Math.max(GAP, vh - panelHeight - GAP)
    }
    if (y < 0) y = GAP
    return { x, y }
}

function toggleFullScreen() {
    isFullScreen.value = !isFullScreen.value
}

function openFieldsModal(event, settingKey) {
    if (isFieldsModalVisible.value && currentSetting.value === settingKey) {
        isFieldsModalVisible.value = false
        return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    fieldsModalPosition.value = clampFloatingPosition(rect, 216, 300)
    isFieldsModalVisible.value = true
    currentSetting.value = settingKey

    const setting = settingTypes.value.find(s => s.key === settingKey)
    currentAllowedTypes.value = setting?.allowedTypes || null
}

function onClickOutside(event) {
    const fieldsModalEl = fieldsModalRef.value
    if (
        isFieldsModalVisible.value &&
        fieldsModalEl &&
        !fieldsModalEl.contains(event.target) &&
        !event.target.closest('[data-fields-modal-trigger]')
    ) {
        isFieldsModalVisible.value = false
    }
}

function handleFieldSelect(field) {
    const key = currentSetting.value
    if (key === 'filters') {
        isFieldsModalVisible.value = false
        filterModalField.value = field
        isFilterModalVisible.value = true
        return
    }
    if (!Array.isArray(selectedFields.value[key])) {
        selectedFields.value[key] = []
    }
    if (!selectedFields.value[key].some(f => f.id === field.id)) {
        selectedFields.value[key].push(field)
    }
    isFieldsModalVisible.value = false
}

function openFilterModalForEdit(field) {
    filterModalField.value = field
    isFilterModalVisible.value = true
}

function openFieldSettingsModal({ field, settingKey }) {
    fieldSettingsModalField.value = field
    fieldSettingsModalSettingKey.value = settingKey
    fieldSettingsModalVisible.value = true
}

function onFieldSettingsModalVisibleChange(visible) {
    fieldSettingsModalVisible.value = visible
    if (!visible) {
        fieldSettingsModalField.value = null
        fieldSettingsModalSettingKey.value = null
    }
}

function onFieldSettingsApply(payload) {
    const key = fieldSettingsModalSettingKey.value
    const field = fieldSettingsModalField.value
    if (!key || !field || !Array.isArray(selectedFields.value[key])) return
    const arr = selectedFields.value[key]
    const idx = arr.findIndex((f) => (f.id ?? f.name) === (field.id ?? field.name))
    if (idx >= 0) {
        selectedFields.value[key] = arr.map((f, i) => (i === idx ? { ...f, ...payload } : f))
    }
    fieldSettingsModalVisible.value = false
    fieldSettingsModalField.value = null
    fieldSettingsModalSettingKey.value = null
}

function onFilterModalApply({ field, filter }) {
    if (!Array.isArray(selectedFields.value.filters)) {
        selectedFields.value.filters = []
    }
    const idx = selectedFields.value.filters.findIndex((f) => f.id === field.id)
    const entry = { ...field, filter }
    if (idx >= 0) {
        selectedFields.value.filters[idx] = entry
    } else {
        selectedFields.value.filters.push(entry)
    }
    isFilterModalVisible.value = false
    filterModalField.value = null
}

function removeField(field, type) {
    selectedFields.value[type] = selectedFields.value[type].filter(f => f.id !== field.id)
}

watch(() => selectedChartType.value, (newVal, oldVal) => {
    if (oldVal && newVal !== oldVal) selectedFields.value = {}
})

watch(selectedFields, async (v) => {
  if (skipNextSelectedFieldsWatch.value || !selectedDataset.value?.id) return
  datasetRowsLoading.value = true
  try {
    await fetchDatasetRows(selectedDataset.value.id, v)
  } catch {
    // Игнорируем ошибку
  } finally {
    datasetRowsLoading.value = false
  }
}, { deep: true })

async function fetchDatasetsOnce() {
  if (datasets.value.length || datasetsLoading.value) return
  datasetsLoading.value = true
  try {
    const { data } = await apiClient.get(endpoints.bi.DatasetsList)
    datasets.value = Array.isArray(data) ? data : (data.results || [])
  } catch {
    // Игнорируем ошибку
  } finally {
    datasetsLoading.value = false
  }
}

const isChartDirty = computed(() => {
    if (!isEditMode.value) return true
    const orig = originalChart.value
    return chartName.value !== (orig.name ?? '') ||
        (selectedDataset.value?.id ?? null) !== (orig.datasetId ?? null) ||
        selectedChartType.value !== (orig.chart_type ?? '') ||
        JSON.stringify(selectedFields.value) !== JSON.stringify(originalSelectedFields.value)
})

onMounted(() => {
    document.addEventListener('mousedown', onClickOutside)
    fetchDatasetsOnce()
    fetchChartIfEditing()
    checkOllamaAvailability()
})

onBeforeUnmount(() => {
    document.removeEventListener('mousedown', onClickOutside)
})
</script>

<style scoped lang="scss">
.page-body {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    gap: 30px;
    margin-bottom: 20px;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
    box-sizing: border-box;
    padding: 0;
    margin-left: 0;
    margin-right: 0;
}

.body-grid {
    display: grid;
    grid-template-columns: minmax(14rem, 17.5rem) minmax(14rem, 1fr) minmax(14rem, 1fr) minmax(14rem, 1fr);
    grid-template-rows: 6rem 6rem auto;
    grid-template-areas:
        "datasets   indicators measures parameters"
        "diagramtype indicators measures parameters"
        "fields     chart      chart    chart";
    gap: 20px;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    overflow-x: hidden;
}

.body-grid.fullscreen {
    grid-template-areas:
        "chart chart chart chart"
        "chart chart chart chart"
        "chart chart chart chart";

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

.body-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 15px 20px;
    flex-shrink: 0;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    overflow-x: hidden;
}

.header-label-icon {
    display: flex;
    justify-content: center;
    gap: 15px;
    align-items: center;
}

.header-label-buttons {
    display: flex;
    gap: 15px;
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

.tooltip-panel-fields {
    position: fixed;
    display: flex;
    flex-direction: column;
    width: 216px;
    max-height: min(300px, 50vh);
    background-color: var(--color-primary-background);
    border-radius: 8px;
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.6);
    z-index: 100;
    padding: 1rem;
    overflow: hidden;
    color: var(--color-primary-text);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
    transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-slide-enter-from {
    opacity: 0;
    transform: translateY(-8px);
}

.fade-slide-enter-to {
    opacity: 1;
    transform: translateY(0);
}

.fade-slide-leave-from {
    opacity: 1;
    transform: translateY(0);
}

.fade-slide-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}

.btn-full-screen:hover {
    background-color: var(--color-hover-background);
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
            "datasets"
            "diagramtype"
            "indicators"
            "measures"
            "parameters"
            "fields"
            "chart";
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