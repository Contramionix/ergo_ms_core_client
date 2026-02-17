<template>
  <div v-if="visible" class="modal-backdrop fade show" @click="close"></div>
  <ModalCenter v-if="visible" modal-id="dashboardConnectionsModal" title="Связи" custom-class="show d-block" dialog-class="modal-lg" @closemodal="close">
    <div class="connections-modal-body">
      <div class="connections-widget-select mb-3">
        <label class="form-label">Основной виджет</label>
        <SelectBox class="connections-widget-select-box" :model-value="localMainItemId" :options="widgetSelectOptions" value-key="id" label-key="name" :include-all-option="false" all-label="Выберите виджет" size="sm" label="" :searchable="true" search-placeholder="Поиск по списку виджетов" @update:model-value="setMainWidgetById">
          <template #selected="{ label }">
            <span class="d-flex align-items-center gap-2 flex-grow-1 min-w-0 text-truncate">
              <component :is="mainWidgetIcon" :size="18" class="flex-shrink-0" />
              <span class="text-truncate">{{ mainWidgetLabel }}</span>
            </span>
          </template>
          <template #option="{ option, label }">
            <span class="d-flex align-items-center gap-2">
              <component :is="option.type === 'Чарт' ? getChartTypeIcon(option.chartType) : Filter" :size="18" class="flex-shrink-0" />
              <span class="text-truncate">{{ label }}</span>
            </span>
          </template>
        </SelectBox>
      </div>

      <div class="connections-search-and-tabs d-flex flex-wrap align-items-center gap-2 mb-3">
        <input v-model="searchQuery" type="text" class="form-control form-control-sm connections-search-input" placeholder="Поиск по списку виджетов"/>
        <div class="connections-filter-tabs d-flex gap-1">
          <button v-for="f in LINK_FILTERS" :key="f.value" type="button" class="btn btn-sm" :class="linkFilter === f.value ? 'btn-primary' : 'btn-outline-secondary'" @click="linkFilter = f.value">
            {{ f.label }}
          </button>
        </div>
      </div>

      <div class="connections-table-wrapper">
        <table class="table table-sm table-hover">
          <thead>
            <tr>
              <th>Виджет</th>
              <th>Тип связи</th>
              <th class="connections-col-action"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredPartnerRows" :key="row.key" :class="{ 'table-active': selectedRowKey === row.key }" @click="selectedRowKey = row.key">
              <td>
                <div class="d-flex align-items-center gap-2">
                  <component :is="row.rowIcon" :size="18" class="connections-row-icon flex-shrink-0" />
                  <span class="text-truncate">{{ row.label }}</span>
                </div>
              </td>
              <td>
                <span v-if="row.isLinked" class="badge bg-secondary">Входящие</span>
                <span v-else-if="mainWidgetType === 'Селектор' && row.isLinkedOut" class="badge bg-secondary">Исходящие</span>
                <span v-else class="text-muted">Не связаны</span>
              </td>
              <td class="connections-col-action">
                <button v-if="row.hasLink" type="button" class="btn btn-sm btn-outline-danger" title="Отключить" @click.stop="removeLink(row)">Отключить</button>
                <button v-else type="button" class="btn btn-sm btn-outline-primary" title="Связать" @click.stop="addLink(row)">Связать</button>
              </td>
            </tr>
            <tr v-if="filteredPartnerRows.length === 0">
              <td colspan="3" class="text-muted text-center py-3">Нет виджетов для отображения</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="connections-modal-actions d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
        <button type="button" class="btn btn-outline-secondary" @click="close">Отмена</button>
        <button type="button" class="btn btn-primary" @click="apply">Применить</button>
      </div>
    </div>
  </ModalCenter>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Filter } from 'lucide-vue-next'
import { getChartTypeIcon } from '@/core/bi/Charts/js/chartTypeIcons.js'
import ModalCenter from '@/components/ModalCenter.vue'
import SelectBox from '@/components/SelectBox.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  items: { type: Array, default: () => [] },
  initialItem: { type: Object, default: null }
})

const emit = defineEmits(['close', 'apply'])

const LINK_FILTERS = [
  { value: 'incoming', label: 'Входящие' },
  { value: 'outgoing', label: 'Исходящие' },
  { value: 'unlinked', label: 'Не связаны' }
]

const searchQuery = ref('')
const linkFilter = ref('incoming')
const selectedRowKey = ref(null)
const localMainItemId = ref(null)
const localItems = ref([])

const linkableWidgets = computed(() => {
  return (props.items || []).filter(i => i.type === 'Чарт' || i.type === 'Селектор')
})

const widgetSelectOptions = computed(() => {
  return linkableWidgets.value.map(w => ({
    id: w.id,
    name: getWidgetLabel(w),
    type: w.type,
    chartType: w.type === 'Чарт' ? (w.chartsList?.[0]?.chart_type) : null
  }))
})

const mainWidget = computed(() => {
  return localItems.value.find(i => i.id === localMainItemId.value) || null
})

const mainWidgetType = computed(() => mainWidget.value?.type || null)

const mainWidgetIcon = computed(() =>
  mainWidgetType.value === 'Чарт'
    ? getChartTypeIcon(mainWidget.value?.chartsList?.[0]?.chart_type)
    : Filter
)

const mainWidgetLabel = computed(() => {
  if (!mainWidget.value) return 'Выберите виджет'
  return getWidgetLabel(mainWidget.value)
})

function getWidgetLabel(widget) {
  if (widget.type === 'Чарт') {
    const list = widget.chartsList || []
    const first = list[0]
    return first?.title || 'Чарт'
  }
  if (widget.type === 'Селектор') {
    const list = widget.selectorsList || []
    const first = list[0]
    return first?.title || first?.internalTitle || 'Селектор'
  }
  return widget.type || ''
}

function getLocalItem(id) {
  return localItems.value.find(i => i.id === id) || null
}

function buildPartnerRows() {
  const main = mainWidget.value
  if (!main || !linkableWidgets.value.length) return []

  const rows = []
  const search = (searchQuery.value || '').trim().toLowerCase()

  if (main.type === 'Чарт') {
    const incomingLinks = main.incomingLinks || []
    linkableWidgets.value.forEach(item => {
      if (item.type !== 'Селектор' || item.id === main.id) return
      const selectors = item.selectorsList || []
      if (selectors.length === 0) {
        const label = getWidgetLabel(item) || `Селектор ${item.id}`
        if (search && !label.toLowerCase().includes(search)) return
        const isLinked = !!incomingLinks.find(
          l => String(l.sourceItemId) === String(item.id) && (l.sourceSelectorId == null || l.sourceSelectorId === '')
        )
        rows.push({
          key: `sel-${item.id}-all`,
          partnerItem: item,
          nestedKey: undefined,
          label,
          isLinked,
          isLinkedOut: false,
          hasLink: isLinked,
          rowIcon: Filter
        })
      } else {
        selectors.forEach(sel => {
          const label = sel.title || sel.internalTitle || sel.selectedField || `Селектор ${sel.id}`
          if (search && !label.toLowerCase().includes(search)) return
          const isLinked = !!incomingLinks.find(
            l => String(l.sourceItemId) === String(item.id) && String(l.sourceSelectorId || '') === String(sel.id || '')
          )
          rows.push({
            key: `sel-${item.id}-${sel.id}`,
            partnerItem: item,
            nestedKey: sel.id,
            nestedSelector: sel,
            label,
            isLinked,
            isLinkedOut: false,
            hasLink: isLinked,
            rowIcon: Filter
          })
        })
      }
    })
  } else {
    linkableWidgets.value.forEach(item => {
      if (item.type !== 'Чарт' || item.id === main.id) return
      const localChart = getLocalItem(item.id) || item
      const charts = localChart.chartsList || item.chartsList || []
      const chartIncomingLinks = localChart.incomingLinks || []
      const isLinkedOut = chartIncomingLinks.some(l => String(l.sourceItemId) === String(main.id))

      if (charts.length === 0) {
        const label = getWidgetLabel(localChart) || `Чарт ${item.id}`
        if (search && !label.toLowerCase().includes(search)) return
        rows.push({
          key: `chart-${item.id}-all`,
          partnerItem: item,
          nestedKey: undefined,
          label,
          isLinked: false,
          isLinkedOut,
          hasLink: isLinkedOut,
          rowIcon: getChartTypeIcon(localChart.chartsList?.[0]?.chart_type)
        })
      } else {
        charts.forEach((ch, idx) => {
          const label = ch.title || `Чарт ${idx + 1}`
          if (search && !label.toLowerCase().includes(search)) return
          const chartTypeUsed = ch?.chart_type ?? localChart.chartsList?.[0]?.chart_type
          rows.push({
            key: `chart-${item.id}-${idx}-${ch.id}`,
            partnerItem: item,
            nestedKey: idx,
            nestedChart: ch,
            label,
            isLinked: false,
            isLinkedOut,
            hasLink: isLinkedOut,
            rowIcon: getChartTypeIcon(chartTypeUsed)
          })
        })
      }
    })
  }

  return rows
}

const allPartnerRows = computed(() => buildPartnerRows())

const FILTER_PREDICATES = {
  incoming: (r) => r.isLinked,
  outgoing: (r) => r.isLinkedOut,
  unlinked: (r) => !r.hasLink
}

const filteredPartnerRows = computed(() => {
  const pred = FILTER_PREDICATES[linkFilter.value] ?? (() => true)
  return allPartnerRows.value.filter(pred)
})

function setMainWidgetById(id) {
  localMainItemId.value = id
  selectedRowKey.value = null
}

function addLink(row) {
  const main = mainWidget.value
  if (!main) return
  if (main.type === 'Чарт') {
    const links = main.incomingLinks || []
    const exists = links.some(
      l =>
        String(l.sourceItemId) === String(row.partnerItem.id) &&
        String(l.sourceSelectorId || '') === String(row.nestedKey ?? '')
    )
    if (!exists) {
      main.incomingLinks = [...links, {
        sourceItemId: row.partnerItem.id,
        sourceSelectorId: row.nestedKey ?? null,
        sourceFieldName: row.nestedSelector?.selectedField ?? null
      }]
    }
  } else {
    const chartItem = getLocalItem(row.partnerItem.id)
    if (!chartItem) return
    const links = chartItem.incomingLinks || []
    const exists = links.some(l => String(l.sourceItemId) === String(main.id))
    if (!exists) {
      const firstSel = (main.selectorsList || [])[0]
      chartItem.incomingLinks = [...links, {
        sourceItemId: main.id,
        sourceSelectorId: firstSel?.id ?? null,
        sourceFieldName: firstSel?.selectedField ?? null
      }]
    }
  }
}

function removeLink(row) {
  const main = mainWidget.value
  if (!main) return
  if (main.type === 'Чарт') {
    main.incomingLinks = (main.incomingLinks || []).filter(
      l =>
        !(String(l.sourceItemId) === String(row.partnerItem.id) &&
          String(l.sourceSelectorId || '') === String(row.nestedKey ?? ''))
    )
  } else {
    const chartItem = getLocalItem(row.partnerItem.id)
    if (!chartItem) return
    chartItem.incomingLinks = (chartItem.incomingLinks || []).filter(
      l => String(l.sourceItemId) !== String(main.id)
    )
  }
}

function close() {
  emit('close')
}

function apply() {
  emit('apply', localItems.value)
}

watch(
  () => [props.visible, props.items, props.initialItem],
  ([visible, items]) => {
    if (visible && items?.length) {
      localItems.value = JSON.parse(JSON.stringify(props.items))
      localMainItemId.value = props.initialItem?.id ?? linkableWidgets.value[0]?.id ?? null
      searchQuery.value = ''
      linkFilter.value = 'incoming'
      selectedRowKey.value = null
    }
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.connections-modal-body {
  min-height: 200px;
}

.connections-table-wrapper {
  max-height: 320px;
  overflow: auto;
}

.connections-col-action {
  width: 100px;
  white-space: nowrap;
}

.connections-widget-select-box :deep(.select-trigger) {
  min-height: 31.5px;
  height: 31.5px;
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
  font-size: 0.875rem;
}

.connections-search-and-tabs {
  .connections-search-input {
    flex: 1;
    min-width: 180px;
  }
}

.connections-filter-tabs {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.connections-modal-actions {
  flex-shrink: 0;
}
</style>