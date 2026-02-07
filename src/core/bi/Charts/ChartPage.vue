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
                <button ref="buttonRef" v-if="!selectedDataset" class="btn btn-sm fw-bold" @click="openDatasetTooltip" style="display: flex; gap: 5px; justify-content: center; align-items: center; width: 100%;">
                    <Plus size="16" />Выбрать датасет
                </button>
                <button ref="buttonRef" v-else class="btn btn-sm fw-bold dataset-selected" @click="openDatasetTooltip" style="display: flex; gap: 5px; align-items: center; width: 100%; border: 1.5px solid #198754;">
                    <Database size="16" />{{ selectedDataset?.name || 'Без имени' }}
                </button>
            </div>
            <div class="diagramtype sectors border-elements elements-color">
                <h5 class="m-0 me-2">Тип диаграммы</h5>
                <div class="chart-type-select">
                <SelectBox v-model="selectedChartType" :options="CHART_TYPE_OPTIONS" value-key="value" label-key="label" :include-all-option="false" all-label="Выберите тип диаграммы" :disabled="!selectedDataset" size="sm">
                    <template #selected="{ option, label }">
                        <span class="d-flex align-items-center gap-2 flex-grow-1 min-w-0">
                            <span class="flex-shrink-0" :style="{ color: getChartTypeColor(option?.value ?? selectedChartType) }">
                                <component :is="getChartTypeIcon(option?.value ?? selectedChartType)" :size="16" />
                            </span>
                            <span class="text-truncate">{{ label }}</span>
                        </span>
                    </template>
                    <template #option="{ value, label }">
                        <span class="d-flex align-items-center gap-2">
                            <span class="flex-shrink-0" :style="{ color: getChartTypeColor(value) }">
                                <component :is="getChartTypeIcon(value)" :size="16" />
                            </span>
                            {{ label }}
                        </span>
                    </template>
                </SelectBox>
                </div>
            </div>
            <div class="fields sectors body-settings border-elements elements-color" v-if="!isFullScreen && selectedChartType">
                <ChartSettingsFields :setting-types="settingTypes" :selected-fields="selectedFields" @add-field-click="openFieldsModal" @remove-field="removeField" @edit-filter="openFilterModalForEdit"/>
            </div>
            <div class="indicators sectors border-elements elements-color">
                <h5 class="m-0 me-2">Показатели</h5>
                <div class="sectors-body">
                    <DatasetIndicators :dataset="selectedDataset" :fields="indicators" />
                </div>
            </div>
            <div class="measures sectors border-elements elements-color">
                <h5 class="m-0 me-2">Измерения</h5>
                <div class="sectors-body">
                    <DatasetMeasures :dataset="selectedDataset" />
                </div>
            </div>
            <div class="parameters settings sectors border-elements elements-color">
                <h5 class="m-0 me-2">Параметры</h5>
                <div class="sectors-body">
                    <DatasetSettings :dataset="selectedDataset" />
                </div>
            </div>
            <div class="body-chart border-elements elements-color" :class="{ fullscreen: isFullScreen }">
                <ChartArea :dataset="datasetRows" :chart-type="selectedChartType" :fields="selectedFields" :key="selectedChartType" :settings="settingTypes" :data-loading="datasetRowsLoading" />
            </div>
        </div>
    </div>


    <transition name="fade-slide" appear>
        <div v-if="isDatasetTooltipVisible" class="tooltip-panel" :style="{ left: tooltipPosition.x + 'px', top: tooltipPosition.y + 'px', position: 'fixed', zIndex: 1000 }" ref="tooltipRef">
            <DatasetTooltip v-if="isDatasetTooltipVisible" :selectedDataset="selectedDataset" :datasets="datasets" :isLoading="datasetsLoading" @select="handleSelectDataset" ref="tooltipRef"/>
        </div>
    </transition>
    <transition name="fade-slide" appear>
        <div v-if="isFieldsModalVisible" class="tooltip-panel-fields" :style="{ left: fieldsModalPosition.x + 'px', top: fieldsModalPosition.y + 'px', position: 'fixed', zIndex: 1000 }" ref="fieldsModalRef">
            <ChartFields :fields="indicators" :selected="selectedForModal" :allowed-types="currentAllowedTypes" @select="handleFieldSelect" />
        </div>
    </transition>
    <ChartNameDialog v-if="isSaveModalVisible" :visible="isSaveModalVisible" v-model="chartName" @update:visible="isSaveModalVisible = $event" @saved="onChartNameSaved" />
    <ChartSettingsFilterModal :visible="isFilterModalVisible" :field="filterModalField" :dataset-id="selectedDataset?.id ?? null" :initial-filter="filterModalInitialFilter" @update:visible="isFilterModalVisible = $event; if (!$event) filterModalField = null" @apply="onFilterModalApply"/>
</template>

<script setup>
import { Maximize, Plus, Database, BrainCircuit } from 'lucide-vue-next'
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { getChartTypeIcon, getChartTypeColor, CHART_TYPE_OPTIONS } from '@/core/bi/Charts/js/chartTypeIcons.js'
import SelectBox from '@/components/SelectBox.vue'

import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'

import DatasetTooltip from '@/core/bi/Charts/components/DatasetsTooltip.vue'
import DatasetIndicators from '@/core/bi/Charts/components/DatasetIndicators.vue'
import DatasetMeasures from '@/core/bi/Charts/components/DatasetMeasures.vue'
import DatasetSettings from '@/core/bi/Charts/components/DatasetSettings.vue'
import ChartFields from '@/core/bi/Charts/ChartFields.vue'
import ChartArea from '@/core/bi/Charts/ChartArea.vue'
import ChartNameDialog from '@/core/bi/Charts/components/ChartNameDialog.vue'
import ChartSettingsFields from '@/core/bi/Charts/components/ChartSettingsFields.vue'
import ChartSettingsFilterModal from '@/core/bi/Charts/components/ChartSettingsFilterModal.vue'

import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import { chartSettingsConfig } from '@/core/bi/MainPage/Sidebar/components/js/chartSettingsConfig.js'
import chartService from '@/core/bi/MainPage/Sidebar/components/js/chartService.js'
import { useAssistant } from '@/core/ai-assistant/js/assistantService.js'
import biClient from '@/core/ai-assistant/bi/js/bi-client.js'

const toast = useToast()
const isFullScreen = ref(false)
const assistant = useAssistant()
const ollamaAvailable = ref(false)

const isDatasetTooltipVisible = ref(false)
const tooltipPosition = ref({ x: 0, y: 0 })
const tooltipRef = ref(null)
const buttonRef = ref(null)

const isFieldsModalVisible = ref(false)
const fieldsModalPosition = ref({ x: 0, y: 0 })
const fieldsModalRef = ref(null)

const isFilterModalVisible = ref(false)
const filterModalField = ref(null)

const filterModalInitialFilter = computed(() =>
  filterModalField.value?.filter ?? null
)

const selectedDataset = ref(null)
const selectedChartType = ref('')

const indicators = ref([])
const currentSetting = ref('')

const datasetRows = ref([])
const datasetRowsLoading = ref(false)

const currentAllowedTypes = ref(null)
const originalChart = ref({})

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

watch(chartData, d => { chartName.value = d?.name || 'Новая диаграмма' }, { immediate: true })

const chartRequiredFieldsFilled = computed(() => {
    if (!selectedDataset.value) {
        return false
    }
    if (!selectedChartType.value) {
        return false
    }

    const required = []
    if (selectedChartType.value === 'line' || selectedChartType.value === 'bar') required.push('x', 'y')
    if (selectedChartType.value === 'pie' || selectedChartType.value === 'donut') required.push('category', 'indicators')
    if (selectedChartType.value === 'scatter') required.push('x', 'y')
    if (selectedChartType.value === 'radar') required.push('category', 'indicators')
    if (selectedChartType.value === 'heatmap') required.push('x', 'y', 'value')

    for (const key of required) {
        if (!selectedFields.value[key] || !selectedFields.value[key].length) {
            return false
        }
    }

    return true
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
        params: selectedFields.value,
        options: {}
    }
    try {
        if (isEditMode.value) {
            const { data: updated } = await chartService.updateChart(chartId.value, payload)
            chartData.value = updated
            originalChart.value = {
                name: updated.name,
                datasetId: typeof updated.dataset === 'object' && updated.dataset !== null ? updated.dataset.id : updated.dataset,
                chart_type: updated.chart_type,
                engine: updated.engine,
                params: JSON.parse(JSON.stringify(updated.params ?? {})),
            }
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
        const { data } = await chartService.getChart(chartId.value)
        chartData.value = data
        let dsObj
        if (typeof data.dataset === 'object' && data.dataset !== null) {
            dsObj = data.dataset
        } else if (data.dataset) {
            const { data: ds } = await chartService.getDataset(data.dataset)
            dsObj = ds
        }
        selectedDataset.value = dsObj

        selectedChartType.value = String(data.chart_type ?? '')
        selectedFields.value = { ...(data.params ?? {}) }

        if (dsObj?.id) {
            const { data: columnsResp } = await chartService.getColumns(dsObj.id)
            // Получаем массив полей с типами из ответа API
            const columns = columnsResp?.columns || []
            indicators.value = Array.isArray(columns) ? columns : []
        }

        if (chartId.value) { 
            const { data: rows } = await chartService.getDatasetRowsAgg(dsObj.id, selectedFields.value)
            datasetRows.value = rows
        }
        originalChart.value = {
            name: data.name,
            datasetId: typeof data.dataset === 'object' && data.dataset !== null ? data.dataset.id : data.dataset,
            chart_type: data.chart_type,
            engine: data.engine,
            params: JSON.parse(JSON.stringify(data.params ?? {})),
        }
    } catch {
        // Игнорируем ошибку
    } finally {
        loading.value = false
    }
}

function runChartAnalysis() {
    if (chartId.value) {
        assistant.openAndAnalyzeChart(chartId.value)
    }
}

async function checkOllamaAvailability() {
    if (!isEditMode.value) return
    const status = await biClient.checkOllamaStatus()
    ollamaAvailable.value = status.available
}

const selectedForModal = computed(() => {
    const result = selectedFields.value[currentSetting.value] || []
    return result
})

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

function openDatasetTooltip() {
    const rect = buttonRef.value.getBoundingClientRect()
    const panelWidth = Math.min(360, window.innerWidth * 0.9)
    const panelHeight = Math.min(436, window.innerHeight * 0.8)
    tooltipPosition.value = clampFloatingPosition(rect, panelWidth, panelHeight)
    isDatasetTooltipVisible.value = true
    fetchDatasetsOnce()
}

function closeDatasetTooltip() {
    isDatasetTooltipVisible.value = false
}

async function handleSelectDataset(ds) {
    selectedFields.value = { y: [], x: [], color: [], sort: [], labels: [], filters: [] }
    selectedDataset.value = ds
    closeDatasetTooltip()
    if (ds?.id) {
        try {
            // Получаем список полей с типами из API
            const { data: columnsResp } = await chartService.getColumns(ds.id)
            const columns = columnsResp?.columns || []
            indicators.value = Array.isArray(columns) ? columns : []
            // Загружаем агрегированные строки
            const { data } = await chartService.getDatasetRowsAgg(ds.id, selectedFields.value)
            datasetRows.value = data
        } catch {
            // Игнорируем ошибку
        }
    }
}

function onClickOutside(event) {
    const datasetModalEl = tooltipRef.value
    const fieldsModalEl = fieldsModalRef.value
    if (
        isDatasetTooltipVisible.value &&
        datasetModalEl &&
        !datasetModalEl.contains(event.target)
    ) {
        isDatasetTooltipVisible.value = false
    }
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

watch(
  () => selectedChartType.value,
  (newVal, oldVal) => {
    if (oldVal && newVal !== oldVal) {
      selectedFields.value = {}
    }
  }
)

watch(
  selectedFields,
  async v => {
    if (selectedDataset.value?.id) {
      datasetRowsLoading.value = true
      try {
        const { data } = await chartService.getDatasetRowsAgg(
          selectedDataset.value.id, v
        )
        datasetRows.value = data
      } catch {
        // Игнорируем ошибку
      } finally {
        datasetRowsLoading.value = false
      }
    }
  },
  { deep: true }
)

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

    if (chartName.value !== (originalChart.value.name ?? '')) return true
    if ((selectedDataset.value?.id || null) !== (originalChart.value.datasetId || null)) return true
    if (selectedChartType.value !== (originalChart.value.chart_type ?? '')) return true

    if (JSON.stringify(selectedFields.value) !== JSON.stringify(originalChart.value.params || {})) return true

    return false
})

onMounted(() => {
    document.addEventListener('mousedown', onClickOutside)
})

onMounted(fetchChartIfEditing)
onMounted(checkOllamaAvailability)

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

.datasets {
    grid-area: datasets;
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

.dataset-selected:hover {
    background-color: var(--color-hover-background);
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

.body-chart {
    flex: 1 1 0%;
    min-height: 360px;
    max-height: min(800px, 75vh);
    overflow: auto;
    width: 100%;
    padding: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
}

.datasets {
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
}

.tooltip-panel {
    position: fixed;
    display: flex;
    flex-direction: column;
    width: min(360px, 90vw);
    min-width: 220px;
    max-width: 98vw;
    min-height: 160px;
    max-height: min(436px, 80vh);
    background-color: var(--color-primary-background);
    border-radius: 12px;
    box-shadow: 0 0 16px 0 #000a;
    z-index: 100;
    padding: 1rem;
    overflow-y: auto;
    overflow-x: hidden;
    color: var(--color-primary-text);
    transition: box-shadow 0.18s, width 0.2s, max-height 0.2s;
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

.chart-type-select :deep(.select-trigger) {
    min-height: 31px;
    font-size: 0.875rem;
    padding: 0.25rem 0.5rem;
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