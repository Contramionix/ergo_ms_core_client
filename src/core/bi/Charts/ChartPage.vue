<template>
    <div class="page-body">
        <ChartHeader :chart-name="chartName" :chart-type-icon-component="chartTypeIconComponent" :chart-type-icon-style="chartTypeIconStyle" :is-edit-mode="isEditMode" :dataset-rows="datasetRows" :ollama-available="ollamaAvailable" :is-full-screen="isFullScreen" :loading="loading" :chart-required-fields-filled="chartRequiredFieldsFilled" :is-chart-dirty="isChartDirty" @run-chart-analysis="runChartAnalysis" @toggle-full-screen="toggleFullScreen" @save-click="onSaveClick"/>
        <ChartBodyGrid v-model:selected-dataset-id="selectedDatasetId" v-model:selected-chart-type="selectedChartType" :datasets="datasets" :datasets-loading="datasetsLoading" :selected-dataset="selectedDataset" :setting-types="settingTypes" :selected-fields="selectedFields" :fields-modal-open-for-key="fieldsModalOpenForKey" :indicators="indicators" :dataset-rows="datasetRows" :fields-for-chart="fieldsForChart" :chart-display-options="chartDisplayOptions" :dataset-rows-loading="datasetRowsLoading" :is-full-screen="isFullScreen" :sort-desc="sortDesc" @open-display-settings="showChartDisplayModal = true" @add-field-click="openFieldsModal" @remove-field="removeField" @edit-filter="openFilterModalForEdit" @open-field-settings="openFieldSettingsModal" @open-formula="openFormulaModal" @open-section-settings="openSectionSettingsModal" @toggle-sort-direction="onToggleSortDirection"/>
    </div>

    <transition name="fade-slide" appear>
        <div v-if="isFieldsModalVisible" class="tooltip-panel-fields" :style="{ left: fieldsModalPosition.x + 'px', top: fieldsModalPosition.y + 'px', position: 'fixed', zIndex: 1000 }" ref="fieldsModalRef">
            <ChartFields :fields="indicators" :selected="selectedForModal" :allowed-types="currentAllowedTypes" :measures-in-chart="measuresInChart" :current-slot-config="currentSlotConfig" @select="handleFieldSelect" />
        </div>
    </transition>
    <ChartNameDialog v-if="isSaveModalVisible" :visible="isSaveModalVisible" v-model="chartName" @update:visible="isSaveModalVisible = $event" @saved="onChartNameSaved" />
    <ChartSettingsFilterModal :visible="isFilterModalVisible" :field="filterModalField" :dataset-id="selectedDataset?.id ?? null" :initial-filter="filterModalInitialFilter" @update:visible="isFilterModalVisible = $event; if (!$event) filterModalField = null" @apply="onFilterModalApply"/>
    <ChartSettingsFieldModal :visible="fieldSettingsModalVisible" :field="fieldSettingsModalField" @update:visible="onFieldSettingsModalVisibleChange" @apply="onFieldSettingsApply"/>
    <ChartSettingsFormulaModal :visible="formulaModalVisible" :field="formulaModalField" :cols="formulaModalCols" :rows="formulaModalRows" @update:visible="onFormulaModalVisibleChange" @apply="onFormulaApply"/>
    <ChartDisplaySettingsModal :visible="showChartDisplayModal" :chart-type="selectedChartType" :display-options="chartDisplayOptions" :available-series="navigatorAvailableSeries" @update:visible="showChartDisplayModal = $event" @apply="onChartDisplayOptionsApply"/>
    <ChartSectionSettingsModal :visible="sectionSettingsModalVisible" :setting-key="sectionSettingsModalSettingKey" :setting="sectionSettingsModalSetting" :chart-type="selectedChartType" :section-options="sectionOptionsForModal" :section-fields="sectionSettingsModalFields" @update:visible="sectionSettingsModalVisible = $event" @apply="onSectionSettingsApply"/>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { getChartTypeIcon, getChartTypeColor } from '@/core/bi/Charts/js/chartTypeIcons.js'
import ChartHeader from '@/core/bi/Charts/ChartHeader.vue'
import ChartBodyGrid from '@/core/bi/Charts/ChartBodyGrid.vue'

import { apiClient } from '@/js/api/manager'
import { endpoints } from '@/js/api/endpoints'

import ChartFields from '@/core/bi/Charts/ChartFields.vue'
import ChartNameDialog from '@/core/bi/Charts/components/ChartNameDialog.vue'
import ChartSettingsFilterModal from '@/core/bi/Charts/components/ChartSettingsFilterModal.vue'
import ChartSettingsFieldModal from '@/core/bi/Charts/components/ChartSettingsFieldModal.vue'
import ChartSettingsFormulaModal from '@/core/bi/Charts/components/ChartSettingsFormulaModal.vue'
import ChartDisplaySettingsModal from '@/core/bi/Charts/components/ChartDisplaySettingsModal.vue'
import ChartSectionSettingsModal from '@/core/bi/Charts/components/ChartSectionSettingsModal.vue'

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
const formulaModalSettingKey = ref(null)

const formulaModalCols = computed(() => (indicators.value || []).map((i) => i.name ?? i.id ?? ''))
const formulaModalRows = computed(() => {
  const cols = indicators.value || []
  const rows = datasetRows.value || []
  return rows.map((row) => cols.map((ind) => row[ind.name] ?? row[ind.id] ?? null))
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
const currentSetting = ref('')

const datasetRows = ref([])
const datasetRowsLoading = ref(false)

const currentAllowedTypes = ref(null)
const originalChart = ref({})
const originalSelectedFields = ref({})

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

const sectionOptionsForModal = computed(() => {
  const key = sectionSettingsModalSettingKey.value
  const opts = chartDisplayOptions.value
  const sectionKeyMap = {
    x: 'sectionAxisX',
    y: 'sectionAxisY',
    y2: 'sectionAxisY2',
    color: 'sectionColors',
    labels: 'sectionLabels',
    columns: 'sectionColumns',
    sizeDots: 'sectionSizeDots',
  }
  const sectionKey = sectionKeyMap[key]
  return sectionKey ? (opts[sectionKey] ?? {}) : {}
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
        const { data: columnsResp } = await chartService.getColumns(datasetId)
        indicators.value = Array.isArray(columnsResp?.columns) ? columnsResp.columns : []
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
        options: { display: { ...chartDisplayOptions.value } }
    }
    try {
        if (isEditMode.value) {
            const { data: updated } = await chartService.updateChart(chartId.value, payload)
            chartData.value = updated
            originalChart.value = buildOriginalChart(updated)
            originalSelectedFields.value = cloneParams(selectedFields.value)
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
        selectedFields.value = cloneParams(data.params)
        originalSelectedFields.value = cloneParams(selectedFields.value)

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
    const key = sectionSettingsModalSettingKey.value
    const opts = chartDisplayOptions.value
    const sectionKeyMap = {
        x: 'sectionAxisX',
        y: 'sectionAxisY',
        y2: 'sectionAxisY2',
        color: 'sectionColors',
        labels: 'sectionLabels',
        columns: 'sectionColumns',
        sizeDots: 'sectionSizeDots',
    }
    const sectionKey = sectionKeyMap[key]
    if (sectionKey) {
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

function onFieldSettingsApply(payload) {
    const key = fieldSettingsModalSettingKey.value
    const field = fieldSettingsModalField.value
    updateFieldInArray(key, field, (f) => ({ ...f, ...payload }))
    closeFieldSettingsModal()
}

function openFormulaModal({ field, settingKey }) {
    formulaModalField.value = field
    formulaModalSettingKey.value = settingKey
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
}

function onFormulaApply({ field, expression }) {
    const key = formulaModalSettingKey.value
    updateFieldInArray(key, field, (f) => ({ ...f, expression }))
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