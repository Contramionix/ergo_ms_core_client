<template>
    <div class="page-body">
        <ChartHeader :chart-name="chartName" :chart-id="chartId" :chart-type-icon-component="chartTypeIconComponent" :chart-type-icon-style="chartTypeIconStyle" :is-edit-mode="isEditMode" :dataset-rows="datasetRows" :ollama-available="ollamaAvailable" :is-full-screen="isFullScreen" :loading="loading" :chart-required-fields-filled="chartRequiredFieldsFilled" :is-chart-dirty="isChartDirty" @run-chart-analysis="runChartAnalysis" @toggle-full-screen="toggleFullScreen" @save-click="onSaveClick" @rename="onRenameClick" @delete="onDeleteClick"/>
        <ChartBodyGrid v-model:selected-dataset-id="selectedDatasetId" v-model:selected-chart-type="selectedChartType" :datasets="datasets" :datasets-loading="datasetsLoading" :selected-dataset="selectedDataset" :setting-types="settingTypes" :selected-fields="selectedFields" :fields-modal-open-for-key="fieldsModalOpenForKey" :indicators="displayedIndicators" :dataset-rows="datasetRows" :fields-for-chart="fieldsForChart" :chart-display-options="chartDisplayOptions" :dataset-rows-loading="datasetRowsLoading" :is-full-screen="isFullScreen" :sort-desc="sortDesc" @open-display-settings="showChartDisplayModal = true" @add-field-click="openFieldsModal" @remove-field="removeField" @edit-filter="openFilterModalForEdit" @open-field-settings="openFieldSettingsModal" @open-formula="openFormulaModal" @open-section-settings="openSectionSettingsModal" @toggle-sort-direction="onToggleSortDirection" @duplicate-indicator="duplicateIndicator" @remove-duplicate-indicator="removeDuplicateIndicator" :measures="displayedMeasures" :parameters="displayedParameters" @duplicate-measure="duplicateMeasure" @remove-duplicate-measure="removeDuplicateMeasure" @edit-parameter="onEditParameter"/>
    </div>

    <transition name="fade-slide" appear>
        <div v-if="isFieldsModalVisible" class="tooltip-panel-fields" :style="{ left: fieldsModalPosition.x + 'px', top: fieldsModalPosition.y + 'px', position: 'fixed', zIndex: 1000 }" ref="fieldsModalRef">
            <ChartFields :fields="displayedIndicators" :measures="displayedMeasures" :parameters="displayedParameters" :selected="selectedForModal" :allowed-types="currentAllowedTypes" :measures-in-chart="measuresInChart" :current-slot-config="currentSlotConfig" @select="handleFieldSelect" />
        </div>
    </transition>
    <NameDialogModal v-if="isSaveModalVisible" :visible="isSaveModalVisible" :model-value="chartName" @update:visible="isSaveModalVisible = $event" title="Название графика" placeholder="Введите название графика" @saved="onChartNameSaved" />
    <NameDialogModal v-if="renameModalVisible" :visible="renameModalVisible" :model-value="chartName" @update:visible="renameModalVisible = $event" title="Название графика" placeholder="Введите название графика" @saved="onRenameSaved" />
    <ConfirmDialog :show="showDeleteDialog" title="Подтверждение удаления" :message="deleteConfirmMessage" confirm-text="Да" cancel-text="Нет" variant="danger" @confirm="confirmDelete" @cancel="cancelDelete" @close="cancelDelete"/>
    <ChartSettingsFilterModal :visible="isFilterModalVisible" :field="filterModalField" :dataset-id="selectedDataset?.id ?? null" :initial-filter="filterModalInitialFilter" @update:visible="isFilterModalVisible = $event; if (!$event) filterModalField = null" @apply="onFilterModalApply"/>
    <ChartSettingsFieldModal :visible="fieldSettingsModalVisible" :field="fieldSettingsModalField" @update:visible="onFieldSettingsModalVisibleChange" @apply="onFieldSettingsApply"/>
    <ChartSettingsFormulaModal :visible="formulaModalVisible" :field="formulaModalField" :cols="formulaModalCols" :rows="formulaModalRows" @update:visible="onFormulaModalVisibleChange" @apply="onFormulaApply"/>
    <ChartDisplaySettingsModal :visible="showChartDisplayModal" :chart-type="selectedChartType" :display-options="chartDisplayOptions" :available-series="navigatorAvailableSeries" @update:visible="showChartDisplayModal = $event" @apply="onChartDisplayOptionsApply"/>
    <ChartSectionSettingsModal :visible="sectionSettingsModalVisible" :setting-key="sectionSettingsModalSettingKey" :setting="sectionSettingsModalSetting" :chart-type="selectedChartType" :section-options="sectionOptionsForModal" :section-fields="sectionSettingsModalFields" @update:visible="sectionSettingsModalVisible = $event" @apply="onSectionSettingsApply"/>
    <ParamsAddModal ref="paramEditModalRef" modal-id="chartParamEditModal" :existing-names="paramEditExistingNames" @update="onParamEditUpdate"/>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { getChartTypeIcon, getChartTypeColor } from '@/core/bi/Charts/js/chartTypeIcons.js'
import ChartHeader from '@/core/bi/Charts/ChartHeader.vue'
import ChartBodyGrid from '@/core/bi/Charts/ChartBodyGrid.vue'

import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'

import ChartFields from '@/core/bi/Charts/ChartFields.vue'
import NameDialogModal from '@/core/bi/components/NameDialogModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ChartSettingsFilterModal from '@/core/bi/Charts/components/ChartSettingsFilterModal.vue'
import ChartSettingsFieldModal from '@/core/bi/Charts/components/ChartSettingsFieldModal.vue'
import ChartSettingsFormulaModal from '@/core/bi/Charts/components/ChartSettingsFormulaModal.vue'
import ChartDisplaySettingsModal from '@/core/bi/Charts/components/ChartDisplaySettingsModal.vue'
import ChartSectionSettingsModal from '@/core/bi/Charts/components/ChartSectionSettingsModal.vue'
import ParamsAddModal from '@/core/bi/Datasets/Params/components/ParamsAddModal.vue'

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

const formulaModalVisible = ref(false)
const formulaModalField = ref(null)
const formulaModalFieldType = ref('indicator')
const formulaModalSettingKey = ref(null)

function mergeWithDuplicates(fromApi, dups) {
  const result = []
  for (const f of fromApi || []) {
    const sourceKey = f.id ?? f.name
    result.push(f)
    result.push(...(dups || []).filter((d) => (d.sourceId ?? d.name) === sourceKey))
  }
  return result
}

const displayedIndicators = computed(() => mergeWithDuplicates(indicators.value, indicatorDuplicates.value))
const displayedMeasures = computed(() => mergeWithDuplicates(measures.value, measureDuplicates.value))
const displayedParameters = computed(() => mergeWithDuplicates(parameters.value, parameterDuplicates.value))

const formulaModalCols = computed(() =>
  (displayedIndicators.value || []).map((i) => i.displayName ?? i.name ?? i.id ?? '')
)
const formulaModalRows = computed(() => {
  const fields = displayedIndicators.value || []
  const rows = datasetRows.value || []
  return rows.map((row) => fields.map((ind) => row[ind.name] ?? row[ind.id] ?? null))
})

const filterModalInitialFilter = computed(() =>
  filterModalField.value?.filter ?? null
)

const selectedDatasetId = ref(null)
const selectedDataset = computed(() =>
  datasets.value.find(d => String(d.id) === String(selectedDatasetId.value)) ?? null
)
const selectedChartType = ref('')

const indicators = ref([])
const indicatorDuplicates = ref([])
const measures = ref([])
const measureDuplicates = ref([])
const parameters = ref([])
const parameterDuplicates = ref([])
const currentSetting = ref('')

const datasetRows = ref([])
const datasetRowsLoading = ref(false)

const currentAllowedTypes = ref(null)
const originalChart = ref({})
const originalSelectedFields = ref({})
const originalIndicatorDuplicates = ref([])
const originalMeasureDuplicates = ref([])
const originalParameterDuplicates = ref([])
const paramToEdit = ref(null)
const paramEditModalRef = ref(null)

const paramEditExistingNames = computed(() => {
  const list = parameters.value || []
  const editingName = paramToEdit.value?.name
  if (!editingName) return list.map(p => p.name).filter(Boolean)
  return list.map(p => p.name).filter(n => n && n !== editingName)
})

const DEFAULT_CHART_DISPLAY_OPTIONS = {
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
    sectionAxisX: {},
    sectionAxisY: {},
    sectionAxisY2: {},
    sectionColors: {},
    sectionLabels: {},
    sectionColumns: {},
    sectionSizeDots: {},
    sectionSort: { desc: false },
    tableSize: 'm',
    pagination: true,
    limit: 100,
    grouping: true,
    tableShowTotals: false,
    preserveSpaces: false,
    stacked: false,
    doughnutShowTotals: false,
    titleMode: 'fieldName',
    indicatorSize: 's',
}
function getDefaultChartDisplayOptions() {
    return cloneParams(DEFAULT_CHART_DISPLAY_OPTIONS)
}
const chartDisplayOptions = ref(getDefaultChartDisplayOptions())
const originalChartDisplayOptions = ref(getDefaultChartDisplayOptions())

const router = useRouter()
const route = useRoute()
const chartId = computed(() => route.params.id)
const loading = ref(false)
const isSaveModalVisible = ref(false)
const renameModalVisible = ref(false)
const showDeleteDialog = ref(false)
const showChartDisplayModal = ref(false)
const sectionSettingsModalVisible = ref(false)
const sectionSettingsModalSettingKey = ref('')
const sectionSettingsModalSetting = ref(null)
const isEditMode = computed(() => !!route.params.id)
const chartData = ref({})
const chartName = ref('')

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

const navigatorAvailableSeries = computed(() => {
  const type = selectedChartType.value
  if (!type || !['line', 'area', 'combined'].includes(type)) return []
  const yFields = selectedFields.value.y ?? []
  const y2Fields = selectedFields.value.y2 ?? []
  const all = [...yFields, ...y2Fields]
  return all.map((f) => ({
    id: f.id ?? f.name,
    label: f.displayName ?? f.name ?? f.label ?? String(f.id ?? f.name),
  }))
})

const SECTION_KEY_MAP = {
  x: 'sectionAxisX',
  y: 'sectionAxisY',
  y2: 'sectionAxisY2',
  color: 'sectionColors',
  labels: 'sectionLabels',
  columns: 'sectionColumns',
  sizeDots: 'sectionSizeDots',
}

const sectionOptionsForModal = computed(() => {
  const key = sectionSettingsModalSettingKey.value
  const sectionKey = SECTION_KEY_MAP[key]
  return sectionKey ? (chartDisplayOptions.value[sectionKey] ?? {}) : {}
})

const sectionSettingsModalFields = computed(() => {
  const key = sectionSettingsModalSettingKey.value
  return selectedFields.value[key] ?? []
})

const fieldsModalOpenForKey = computed(() =>
  isFieldsModalVisible.value ? currentSetting.value : null
)

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

function hasRequiredFieldsForChartType(chartType, fields) {
    if (!chartType) return false
    const required = REQUIRED_FIELDS_BY_CHART_TYPE[chartType]
    if (!required?.length) return false
    return required.every(key => fields[key]?.length > 0)
}

function cloneParams(params) {
    return JSON.parse(JSON.stringify(params ?? {}))
}

function normalizeListResponse(data) {
    return Array.isArray(data) ? data : (data?.results ?? [])
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
    try {
        const { data } = await chartService.getDatasetRowsAgg(datasetId, filterParamsForApi(params ?? selectedFields.value))
        datasetRows.value = data
    } catch {
        // Игнорируем ошибку
    }
}

async function loadDatasetColumnsAndRows(datasetId, params) {
    if (!datasetId) return
    try {
        const [columnsRes, paramsRes] = await Promise.all([
            chartService.getColumns(datasetId),
            chartService.getParams(datasetId)
        ])
        const columns = Array.isArray(columnsRes?.data?.columns) ? columnsRes.data.columns : []
        indicators.value = columns
        measures.value = columns.filter((c) => (c.expression || '').trim() !== '')
        parameters.value = normalizeListResponse(paramsRes?.data)
        if (selectedChartType.value && hasRequiredFieldsForChartType(selectedChartType.value, params)) {
            await fetchDatasetRows(datasetId, params)
        }
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

const sortDesc = computed(() => chartDisplayOptions.value.sectionSort?.desc ?? false)

const fieldsForChart = computed(() => {
  const params = filterParamsForApi(selectedFields.value)
  const sortArr = Array.isArray(params.sort) ? params.sort : []
  const sortMapped = sortArr.map((f) => ({ field: f.name, desc: sortDesc.value }))
  return {
    ...params,
    sort: sortMapped,
  }
})

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
    indicatorDuplicates.value = []
    measureDuplicates.value = []
    parameterDuplicates.value = []
    await loadDatasetColumnsAndRows(ds?.id, selectedFields.value)
}

watch(selectedDataset, async (newDs, oldDs) => {
    if (skipNextDatasetWatch.value) return
    if (newDs?.id === oldDs?.id) return
    await onSelectedDatasetChange(newDs)
})

const chartRequiredFieldsFilled = computed(() => {
    if (!selectedDataset.value || !selectedChartType.value) return false
    return hasRequiredFieldsForChartType(selectedChartType.value, selectedFields.value)
})

const deleteConfirmMessage = computed(() => {
    const name = chartName.value || 'график'
    return `Вы действительно хотите удалить график "${name}"?`
})

function onSaveClick() {
    if (isEditMode.value) {
        onChartNameSaved({ name: chartName.value })
    } else {
        isSaveModalVisible.value = true
    }
}

function onRenameClick() {
    renameModalVisible.value = true
}

async function onRenameSaved({ name }) {
    chartName.value = name
    const params = cloneParams(selectedFields.value)
    params.indicatorDuplicates = cloneParams(indicatorDuplicates.value)
    params.measureDuplicates = cloneParams(measureDuplicates.value)
    params.parameterDuplicates = cloneParams(parameterDuplicates.value)
    const payload = {
        name,
        dataset: selectedDataset.value.id,
        chart_type: selectedChartType.value,
        engine: 'echarts',
        params,
        options: { display: { ...chartDisplayOptions.value } }
    }
    try {
        const { data: updated } = await chartService.updateChart(chartId.value, payload)
        chartData.value = updated
        originalChart.value = buildOriginalChart(updated)
        toast.success('График успешно переименован')
    } catch {
        toast.error('Не удалось переименовать график')
    }
    renameModalVisible.value = false
}

function onDeleteClick() {
    showDeleteDialog.value = true
}

async function confirmDelete() {
    if (!chartId.value) return
    try {
        const res = await apiClient.delete(`/bi_analysis/bi_charts/${chartId.value}/`)
        if (res?.success !== false) {
            toast.success('График успешно удалён')
            router.push('/bi/charts/')
        } else {
            toast.error('Ошибка при удалении: ' + (res?.message || ''))
        }
    } catch (err) {
        toast.error('Ошибка при удалении: ' + err)
    }
    cancelDelete()
}

function cancelDelete() {
    showDeleteDialog.value = false
}

async function onChartNameSaved({ name }) {
    chartName.value = name
    const params = cloneParams(selectedFields.value)
    params.indicatorDuplicates = cloneParams(indicatorDuplicates.value)
    params.measureDuplicates = cloneParams(measureDuplicates.value)
    params.parameterDuplicates = cloneParams(parameterDuplicates.value)
    const payload = {
        name,
        dataset: selectedDataset.value.id,
        chart_type: selectedChartType.value,
        engine: 'echarts',
        params,
        options: { display: { ...chartDisplayOptions.value } }
    }
    try {
        if (isEditMode.value) {
            const { data: updated } = await chartService.updateChart(chartId.value, payload)
            chartData.value = updated
            originalChart.value = buildOriginalChart(updated)
            originalSelectedFields.value = cloneParams(selectedFields.value)
            originalIndicatorDuplicates.value = cloneParams(indicatorDuplicates.value)
            originalMeasureDuplicates.value = cloneParams(measureDuplicates.value)
            originalParameterDuplicates.value = cloneParams(parameterDuplicates.value)
            originalChartDisplayOptions.value = cloneParams(chartDisplayOptions.value)
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
        const loadedParams = data.params ?? {}
        const {
            indicatorDuplicates: loadedDups,
            measureDuplicates: loadedMeasureDups,
            parameterDuplicates: loadedParamDups,
            ...restParams
        } = loadedParams
        selectedFields.value = cloneParams(restParams)
        indicatorDuplicates.value = Array.isArray(loadedDups) ? cloneParams(loadedDups) : []
        measureDuplicates.value = Array.isArray(loadedMeasureDups) ? cloneParams(loadedMeasureDups) : []
        parameterDuplicates.value = Array.isArray(loadedParamDups) ? cloneParams(loadedParamDups) : []
        originalSelectedFields.value = cloneParams(selectedFields.value)
        originalIndicatorDuplicates.value = cloneParams(indicatorDuplicates.value)
        originalMeasureDuplicates.value = cloneParams(measureDuplicates.value)
        originalParameterDuplicates.value = cloneParams(parameterDuplicates.value)

        const loadedDisplay = data.options?.display
        if (loadedDisplay && typeof loadedDisplay === 'object') {
            chartDisplayOptions.value = getDefaultChartDisplayOptions()
            Object.assign(chartDisplayOptions.value, {
                showTitle: loadedDisplay.showTitle !== false,
                titleText: loadedDisplay.titleText ?? '',
                showLegend: loadedDisplay.showLegend !== false,
                showTooltip: loadedDisplay.showTooltip !== false,
                sumInTooltips: loadedDisplay.sumInTooltips !== false,
                showNavigator: loadedDisplay.showNavigator === true,
                navigatorMode: loadedDisplay.navigatorMode ?? 'all',
                navigatorLineIds: Array.isArray(loadedDisplay.navigatorLineIds) ? [...loadedDisplay.navigatorLineIds] : [],
                defaultPeriodValue: Math.max(1, Number(loadedDisplay.defaultPeriodValue) || 1),
                defaultPeriodUnit: loadedDisplay.defaultPeriodUnit ?? 'day',
                sectionAxisX: typeof loadedDisplay.sectionAxisX === 'object' && loadedDisplay.sectionAxisX ? { ...loadedDisplay.sectionAxisX } : {},
                sectionAxisY: typeof loadedDisplay.sectionAxisY === 'object' && loadedDisplay.sectionAxisY ? { ...loadedDisplay.sectionAxisY } : {},
                sectionAxisY2: typeof loadedDisplay.sectionAxisY2 === 'object' && loadedDisplay.sectionAxisY2 ? { ...loadedDisplay.sectionAxisY2 } : {},
                sectionColors: typeof loadedDisplay.sectionColors === 'object' && loadedDisplay.sectionColors ? { ...loadedDisplay.sectionColors } : {},
                sectionLabels: typeof loadedDisplay.sectionLabels === 'object' && loadedDisplay.sectionLabels ? { ...loadedDisplay.sectionLabels } : {},
                sectionColumns: typeof loadedDisplay.sectionColumns === 'object' && loadedDisplay.sectionColumns ? { ...loadedDisplay.sectionColumns } : {},
                sectionSizeDots: typeof loadedDisplay.sectionSizeDots === 'object' && loadedDisplay.sectionSizeDots ? { ...loadedDisplay.sectionSizeDots } : {},
                sectionSort: typeof loadedDisplay.sectionSort === 'object' && loadedDisplay.sectionSort ? { ...loadedDisplay.sectionSort } : { desc: false },
                tableSize: loadedDisplay.tableSize ?? 'm',
                pagination: loadedDisplay.pagination !== false,
                limit: Math.max(1, Number(loadedDisplay.limit) || 100),
                grouping: loadedDisplay.grouping !== false,
                tableShowTotals: loadedDisplay.tableShowTotals === true,
                preserveSpaces: loadedDisplay.preserveSpaces === true,
                stacked: loadedDisplay.stacked === true,
                doughnutShowTotals: loadedDisplay.doughnutShowTotals === true,
                titleMode: loadedDisplay.titleMode ?? 'fieldName',
                indicatorSize: loadedDisplay.indicatorSize ?? 's',
            })
            originalChartDisplayOptions.value = cloneParams(chartDisplayOptions.value)
        }

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

function onChartDisplayOptionsApply(options) {
    chartDisplayOptions.value = { ...chartDisplayOptions.value, ...options }
    showChartDisplayModal.value = false
}

function onToggleSortDirection() {
  const opts = chartDisplayOptions.value
  const prev = opts.sectionSort ?? { desc: false }
  chartDisplayOptions.value = {
    ...opts,
    sectionSort: { ...prev, desc: !prev.desc },
  }
}

function openSectionSettingsModal({ settingKey, setting }) {
    sectionSettingsModalSettingKey.value = settingKey
    sectionSettingsModalSetting.value = setting
    sectionSettingsModalVisible.value = true
}

function onSectionSettingsApply(payload) {
    const sectionKey = SECTION_KEY_MAP[sectionSettingsModalSettingKey.value]
    if (sectionKey) {
        const opts = chartDisplayOptions.value
        chartDisplayOptions.value = {
            ...opts,
            [sectionKey]: { ...(opts[sectionKey] ?? {}), ...payload }
        }
    }
    sectionSettingsModalVisible.value = false
    sectionSettingsModalSettingKey.value = ''
    sectionSettingsModalSetting.value = null
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
        closeFieldSettingsModal()
    }
}

function updateFieldInArray(key, field, updater) {
    if (!key || !field || !Array.isArray(selectedFields.value[key])) return false
    const arr = selectedFields.value[key]
    const idx = arr.findIndex((f) => (f.id ?? f.name) === (field.id ?? field.name))
    if (idx >= 0) {
        selectedFields.value[key] = arr.map((f, i) => (i === idx ? updater(f) : f))
        return true
    }
    return false
}

function updateFieldInAllCategories(field, updater) {
    if (!field) return
    for (const key of Object.keys(selectedFields.value)) {
        updateFieldInArray(key, field, updater)
    }
}

function onFieldSettingsApply(payload) {
    const field = fieldSettingsModalField.value
    updateFieldInAllCategories(field, (f) => ({ ...f, ...payload }))
    closeFieldSettingsModal()
}

function openFormulaModal({ field, settingKey, fieldType }) {
    formulaModalField.value = field
    formulaModalSettingKey.value = settingKey
    formulaModalFieldType.value = fieldType ?? 'indicator'
    formulaModalVisible.value = true
}

function onFormulaModalVisibleChange(visible) {
    formulaModalVisible.value = visible
    if (!visible) {
        closeFormulaModal()
    }
}

function closeFormulaModal() {
    formulaModalField.value = null
    formulaModalSettingKey.value = null
    formulaModalFieldType.value = 'indicator'
}

function updateDuplicateExpression(duplicatesRef, fieldId, expression) {
    duplicatesRef.value = (duplicatesRef.value || []).map((d) =>
        d.id === fieldId ? { ...d, expression } : d
    )
}

function onFormulaApply({ field, expression }) {
    updateFieldInAllCategories(field, (f) => ({ ...f, expression }))
    if (field?.isDuplicate && field?.id) {
        const type = formulaModalFieldType.value
        const refByType = { measure: measureDuplicates, parameter: parameterDuplicates, indicator: indicatorDuplicates }
        const ref = refByType[type] ?? indicatorDuplicates
        updateDuplicateExpression(ref, field.id, expression)
    }
    formulaModalVisible.value = false
    closeFormulaModal()
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

function closeFieldSettingsModal() {
    fieldSettingsModalVisible.value = false
    fieldSettingsModalField.value = null
    fieldSettingsModalSettingKey.value = null
}

function removeField(field, type) {
    selectedFields.value[type] = selectedFields.value[type].filter(f => f.id !== field.id)
}

function getSourceId(f) {
    return f?.sourceId ?? f?.id ?? f?.name
}

function getBaseDisplayName(f) {
    return f?.displayName ?? f?.name ?? f?.title ?? 'Без имени'
}

function addDuplicate(field, duplicatesRef, idPrefix) {
    const sourceId = getSourceId(field)
    const baseName = field.isDuplicate ? (field.displayName ?? field.name).replace(/\s*\(\d+\)\s*$/, '').trim() : getBaseDisplayName(field)
    const dups = duplicatesRef.value || []
    const n = dups.filter((d) => getSourceId(d) === sourceId).length + 1
    duplicatesRef.value = [...dups, {
        id: `${idPrefix}${sourceId}_${Date.now()}_${n}`,
        sourceId,
        name: field.name,
        type: field.type,
        displayName: `${baseName} (${n})`,
        isDuplicate: true,
    }]
}

function duplicateIndicator(field) {
    addDuplicate(field, indicatorDuplicates, '__dup_')
}

function removeDuplicateIndicator(field) {
    if (!field?.isDuplicate) return
    const id = field.id
    indicatorDuplicates.value = (indicatorDuplicates.value || []).filter((d) => d.id !== id)
    for (const key of Object.keys(selectedFields.value)) {
        const arr = selectedFields.value[key]
        if (Array.isArray(arr)) {
            selectedFields.value[key] = arr.filter((f) => (f.id ?? f.name) !== id)
        }
    }
}

function duplicateMeasure(field) {
    addDuplicate(field, measureDuplicates, '__dup_measure_')
}

function removeDuplicateMeasure(field) {
    if (!field?.isDuplicate) return
    measureDuplicates.value = (measureDuplicates.value || []).filter((d) => d.id !== field.id)
}

function onEditParameter(param) {
    if (!param || typeof param.id !== 'number') return
    paramToEdit.value = param
    const row = {
        name: param.name ?? '',
        type: param.type ?? 'string',
        defaultValue: param.default_value ?? param.defaultValue ?? ''
    }
    if (paramEditModalRef.value && typeof paramEditModalRef.value.open === 'function') {
        paramEditModalRef.value.open({ row, editId: param.id })
    }
}

async function onParamEditUpdate(payload) {
    if (payload?.id == null) return
    try {
        await chartService.updateParam(payload.id, {
            name: payload.name,
            type: payload.type,
            default_value: payload.default
        })
        paramToEdit.value = null
        const dsId = selectedDataset.value?.id
        if (dsId) {
            const { data } = await chartService.getParams(dsId)
            parameters.value = normalizeListResponse(data)
        }
        toast.success('Параметр обновлён')
    } catch {
        toast.error('Не удалось обновить параметр')
    }
}

async function loadDatasetRowsIfNeeded(params) {
    if (!selectedDataset.value?.id || !selectedChartType.value) return
    if (!hasRequiredFieldsForChartType(selectedChartType.value, params)) return
    datasetRowsLoading.value = true
    try {
        await fetchDatasetRows(selectedDataset.value.id, params)
    } finally {
        datasetRowsLoading.value = false
    }
}

watch(() => selectedChartType.value, async (newVal, oldVal) => {
    if (oldVal && newVal !== oldVal) {
        selectedFields.value = {}
    }
    if (newVal && !oldVal && !skipNextSelectedFieldsWatch.value) {
        await loadDatasetRowsIfNeeded(selectedFields.value)
    }
})

watch(selectedFields, async (v) => {
    if (skipNextSelectedFieldsWatch.value) return
    await loadDatasetRowsIfNeeded(v)
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
        JSON.stringify(selectedFields.value) !== JSON.stringify(originalSelectedFields.value) ||
        JSON.stringify(indicatorDuplicates.value) !== JSON.stringify(originalIndicatorDuplicates.value) ||
        JSON.stringify(measureDuplicates.value) !== JSON.stringify(originalMeasureDuplicates.value) ||
        JSON.stringify(parameterDuplicates.value) !== JSON.stringify(originalParameterDuplicates.value) ||
        JSON.stringify(chartDisplayOptions.value) !== JSON.stringify(originalChartDisplayOptions.value)
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
    gap: 20px;
    margin-bottom: 20px;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
    box-sizing: border-box;
    padding: 0;
    margin-left: 0;
    margin-right: 0;
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
</style>