import {
  getLineData,
  getBarData,
  getPieData,
  getRadarData,
  getScatterData,
  getHeatmapData,
  getFunnelData,
  getGaugeData,
  getTreemapData
} from './chartDataTransform'
import { isMeasureValuesField } from '../../js/measureVirtualFields.js'

function findField(fields, keys, many = false) {
  if (!fields) return many ? [] : null
  for (const k of keys) {
    if (fields[k] && fields[k].length)
      return many ? fields[k] : fields[k][0]
  }
  return many ? [] : null
}

export function normalizedFilters(fields) {
  const raw = fields?.filters ?? []
  return raw.map((f) => ({
    field: { name: f.name },
    op: f.filter?.op ?? 'eq',
    value: f.filter?.value ?? []
  }))
}

/**
 * Строит опцию ECharts из type, fields, settings, dataset, displayOptions.
 * @param {{ type: string, fields: Object, settings: Array, dataset: Array, displayOptions: Object, compact: boolean }} params
 * @returns {import('echarts').EChartsOption}
 */
export function buildEChartsOption({ type, fields = {}, settings = [], dataset = [], displayOptions = {}, compact = false }) {
  const filters = normalizedFilters(fields)
  if (!dataset?.length && type !== 'heatmap') return emptyOption()

  let option
  switch (type) {
    case 'line':
      option = buildLineOption(fields, settings, dataset, filters, compact)
      break
    case 'bar':
      option = buildBarOption(fields, settings, dataset, filters, compact)
      break
    case 'pie':
      option = buildPieOption(fields, dataset, false, filters, compact)
      break
    case 'doughnut':
      option = buildPieOption(fields, dataset, true, filters, compact)
      break
    case 'scatter':
      option = buildScatterOption(fields, dataset, filters, compact)
      break
    case 'radar':
      option = buildRadarOption(fields, dataset, filters, compact)
      break
    case 'heatmap':
      option = buildHeatmapOption(fields, dataset, compact)
      break
    case 'area':
      option = buildAreaOption(fields, settings, dataset, filters, compact)
      break
    case 'barHorizontal':
      option = buildBarHorizontalOption(fields, settings, dataset, filters, compact)
      break
    case 'combined':
      option = buildCombinedOption(fields, settings, dataset, filters, compact)
      break
    case 'funnel':
      option = buildFunnelOption(fields, dataset, filters)
      break
    case 'gauge':
      option = buildGaugeOption(fields, dataset, filters)
      break
    case 'treemap':
      option = buildTreemapOption(fields, dataset, filters)
      break
    default:
      return emptyOption()
  }
  return applyDisplayOptions(option, displayOptions, type)
}

function applyDisplayOptions(option, displayOptions, type) {
  const opts = displayOptions || {}
  const showTitle = opts.showTitle !== false
  const showLegend = opts.showLegend !== false
  const showTooltip = opts.showTooltip !== false
  const sumInTooltips = opts.sumInTooltips === true
  const showNavigator = opts.showNavigator === true
  const navigatorMode = opts.navigatorMode || 'all'
  const navigatorLineIds = Array.isArray(opts.navigatorLineIds) ? opts.navigatorLineIds : []

  if (option.title) {
    option.title = showTitle
      ? { ...option.title, show: true, text: opts.titleText != null ? String(opts.titleText) : (option.title.text || '') }
      : { ...option.title, show: false }
  } else if (showTitle && opts.titleText) {
    option.title = { text: String(opts.titleText), left: 'center', top: 10, textStyle: { fontSize: 14 } }
  }

  if (option.legend) {
    option.legend = { ...option.legend, show: showLegend }
  }

  if (option.tooltip) {
    option.tooltip = { ...option.tooltip, show: showTooltip }
    if (showTooltip && sumInTooltips && option.tooltip.trigger === 'axis' && option.series?.length) {
      const baseFormatter = option.tooltip.formatter
      option.tooltip.formatter = (params) => {
        const parts = typeof baseFormatter === 'function' ? baseFormatter(params) : null
        const lines = Array.isArray(params) ? params : (params ? [params] : [])
        const sum = lines.reduce((acc, p) => acc + (Number(p.value) || 0), 0)
        if (parts != null) return parts + (sum !== 0 ? `<br/>Сумма: ${sum}` : '')
        const defaultStr = lines.map(p => `${p.marker ?? ''} ${p.seriesName ?? ''}: ${p.value ?? ''}`).join('<br/>')
        return defaultStr + (sum !== 0 ? `<br/>Сумма: ${sum}` : '')
      }
    }
  }

  if (type === 'area' && opts.stacked === true && option.series?.length) {
    option.series.forEach((s) => {
      s.stack = 'stack1'
    })
  }

  if (type === 'doughnut' && opts.doughnutShowTotals === true && option.series?.length) {
    const series = option.series[0]
    const data = series.data || []
    const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0)
    series.label = {
      show: true,
      position: 'center',
      formatter: () => (Number.isFinite(total) ? String(total) : ''),
      fontSize: 14,
      fontWeight: 'bold',
    }
    series.labelLine = { ...(series.labelLine || {}), show: false }
  }

  if (showNavigator && (type === 'line' || type === 'area' || type === 'combined') && option.series?.length) {
    let series = option.series
    if (navigatorMode === 'select' && navigatorLineIds.length > 0) {
      series = option.series.filter((s) => navigatorLineIds.includes(s.name))
      if (series.length === 0) series = option.series
      option.series = series
    }
    const dataLength = option.xAxis?.data?.length ?? 0
    const defaultPeriodValue = Math.max(1, Number(opts.defaultPeriodValue) || 1)
    const start = dataLength > 0 ? Math.max(0, 100 - (defaultPeriodValue * 100) / Math.max(dataLength, 1)) : 0
    option.dataZoom = [
      {
        type: 'slider',
        show: true,
        xAxisIndex: 0,
        start: Math.min(start, 99),
        end: 100,
        bottom: 8,
        height: 20,
      },
    ]
    const gridBottom = option.grid?.bottom
    if (typeof gridBottom === 'number') {
      option.grid = { ...option.grid, bottom: gridBottom + 36 }
    }
  }

  applySectionDisplayOptions(option, opts)
  return option
}

function applySectionDisplayOptions(option, opts) {
  const sectionX = opts.sectionAxisX || {}
  const sectionY = opts.sectionAxisY || {}
  const sectionY2 = opts.sectionAxisY2 || {}

  if (option.xAxis) {
    const xList = Array.isArray(option.xAxis) ? option.xAxis : [option.xAxis]
    const xConf = xList[0] ? patchAxisWithSection(xList[0], sectionX) : null
    if (xConf) option.xAxis = Array.isArray(option.xAxis) ? [xConf, ...xList.slice(1)] : xConf
  }

  if (option.yAxis) {
    const yList = Array.isArray(option.yAxis) ? option.yAxis : [option.yAxis]
    const patched = yList.map((ax, i) => {
      const section = i === 0 ? sectionY : i === 1 ? sectionY2 : {}
      return patchAxisWithSection(ax, section)
    })
    option.yAxis = patched.length === 1 ? patched[0] : patched
  }
}

function patchAxisWithSection(axis, section) {
  if (!axis || !section || Object.keys(section).length === 0) return axis
  const next = { ...axis }
  if (section.axisOnChart === false) next.show = false
  if (section.axisType === 'log' && (next.type === 'value' || next.type === 'category')) next.type = 'log'
  if (section.axisName === false && next.name) next.name = ''
  if (section.axisName === true && !next.name && axis.name) next.name = axis.name
  if (section.grid === false) next.splitLine = { ...(next.splitLine || {}), show: false }
  if (section.grid === true && next.splitLine) next.splitLine = { ...next.splitLine, show: true }
  if (section.labels === false) next.axisLabel = { ...(next.axisLabel || {}), show: false }
  if (section.labels === true && next.axisLabel) next.axisLabel = { ...next.axisLabel, show: true }
  if (section.labelType === 'horizontal' && next.axisLabel) next.axisLabel = { ...next.axisLabel, rotate: 0 }
  if (section.labelType === 'vertical' && next.axisLabel) next.axisLabel = { ...next.axisLabel, rotate: 90 }
  if (section.labelType === 'angled' && next.axisLabel) next.axisLabel = { ...next.axisLabel, rotate: 45 }
  if (section.scaleRange === 'zero_max' && (next.type === 'value' || next.type === 'log')) next.min = 0
  if (section.scaleMode === 'manual' && (next.type === 'value' || next.type === 'log')) {
    const minVal = typeof section.scaleMin === 'number' && !Number.isNaN(section.scaleMin) ? section.scaleMin : null
    if (next.type === 'log' && (minVal == null || minVal <= 0)) next.min = 0.001
    else if (minVal != null) next.min = minVal
    if (typeof section.scaleMax === 'number' && !Number.isNaN(section.scaleMax)) next.max = section.scaleMax
  }
  return next
}

function emptyOption() {
  return {
    tooltip: { appendToBody: true },
    title: { text: 'Нет данных', left: 'center', top: 'middle', textStyle: { fontSize: 14 } },
    xAxis: { type: 'category', data: [] },
    yAxis: { type: 'value' },
    series: []
  }
}

function buildLegend(showLegend, compact) {
  if (!showLegend) return { show: false }
  if (compact) return { show: false }
  return { bottom: compact ? 8 : 0, type: 'scroll' }
}

function buildGrid(base, compact, compactValues) {
  const { containLabel, ...baseWithoutContainLabel } = base
  if (!compact) return baseWithoutContainLabel
  const nextGrid = { ...baseWithoutContainLabel, ...compactValues }
  if (typeof nextGrid.left === 'number' && typeof nextGrid.right === 'number') {
    const minSide = Math.min(nextGrid.left, nextGrid.right)
    nextGrid.left = minSide
    nextGrid.right = minSide
  }
  if (typeof nextGrid.bottom === 'number') {
    nextGrid.bottom = Math.max(16, Math.round(nextGrid.bottom * 0.4))
  }
  return nextGrid
}

function applyCompactAxis(axis) {
  if (!axis) return axis
  return {
    ...axis,
    nameGap: 8,
    nameLocation: axis.nameLocation || 'middle',
    axisLabel: {
      ...(axis.axisLabel || {}),
      margin: 6,
      overflow: 'truncate',
      width: 120,
      ellipsis: '…',
      hideOverlap: true
    }
  }
}

function applyCompactValueAxis(axis) {
  if (!axis) return axis
  const nextAxis = applyCompactAxis(axis)
  return {
    ...nextAxis,
    name: '',
    axisLabel: {
      ...(nextAxis.axisLabel || {}),
      inside: true,
      align: 'right',
      padding: [0, 4, 0, 0]
    }
  }
}

function applyCompactCategoryAxis(axis) {
  if (!axis) return axis
  return {
    ...axis,
    axisLabel: {
      ...(axis.axisLabel || {}),
      show: false
    },
    axisTick: { show: false }
  }
}

function buildCategoryPalette(size) {
  const palette = [
    '#41b883', '#2f855a', '#38a169', '#68d391', '#9ae6b4',
    '#3b82f6', '#2563eb', '#60a5fa', '#93c5fd', '#1d4ed8',
    '#f59e0b', '#fbbf24', '#f97316', '#fb923c', '#fcd34d',
    '#ef4444', '#f87171', '#fb7185', '#e11d48', '#f43f5e'
  ]
  const colors = []
  for (let i = 0; i < size; i += 1) {
    colors.push(palette[i % palette.length])
  }
  return colors
}

function buildLineOption(fields, settings, dataset, filters, compact) {
  const xFields = findField(fields, ['x'], true)
  const yFields = findField(fields, ['y'], true)
  const y2Fields = findField(fields, ['y2'], true)
  const colorField = findField(fields, ['color', 'colors'])
  const sortFields = fields?.sort ?? []
  const labelField = findField(fields, ['labels', 'label'])
  const labelFieldForX = isMeasureValuesField(labelField) ? null : labelField

  const { labels, datasets } = getLineData(
    dataset,
    xFields || [],
    yFields || [],
    y2Fields || [],
    colorField,
    sortFields,
    labelFieldForX,
    filters
  )

  if (!labels?.length || !datasets?.length) return emptyOption()

  const yAxisList = []
  const hasY2 = datasets.some(d => d.yAxisID === 'y2')
  yAxisList.push({ type: 'value', name: yFields?.[0]?.label || 'Y', position: 'left' })
  if (hasY2) {
    yAxisList.push({
      type: 'value',
      name: y2Fields?.[0]?.label || yFields?.[1]?.label || 'Y2',
      position: 'right',
      splitLine: { show: false }
    })
  }

  const showLabelsFromY = (yFields || []).some((f) => f.showCaption !== false) ||
    (y2Fields || []).some((f) => f.showCaption !== false)
  const showMeasureValuesLabels = isMeasureValuesField(labelField) || showLabelsFromY
  const series = datasets.map((ds) => ({
    name: ds.label,
    type: 'line',
    data: ds.data,
    smooth: true,
    lineStyle: ds.borderDash?.length ? { type: 'dashed', color: ds.borderColor } : { color: ds.borderColor },
    itemStyle: { color: ds.borderColor },
    yAxisIndex: ds.yAxisID === 'y2' ? 1 : 0,
    ...(showMeasureValuesLabels && { label: { show: true, position: 'top' } })
  }))

  return {
    tooltip: { trigger: 'axis', appendToBody: true },
    legend: buildLegend(true, compact),
    grid: buildGrid(
      { left: 60, right: hasY2 ? 60 : 40, bottom: 80, top: 20 },
      compact,
      { left: 36, right: hasY2 ? 36 : 24, bottom: 56, top: 12 }
    ),
    xAxis: { type: 'category', data: labels, boundaryGap: false },
    yAxis: yAxisList.length === 1 ? yAxisList[0] : yAxisList,
    series
  }
}

function buildBarOption(fields, settings, dataset, filters, compact) {
  const xField = findField(fields, ['x'], true)
  const yField = findField(fields, ['y'], true)
  const colorField = findField(fields, ['color', 'colors'])
  const labelFieldsRaw = findField(fields, ['labels', 'label'], true)
  const labelFields = labelFieldsRaw?.filter(f => !isMeasureValuesField(f)) ?? []
  const showLabelsFromY = (yField || []).some((f) => f.showCaption !== false)
  const showMeasureValuesLabels = labelFieldsRaw?.some(isMeasureValuesField) || showLabelsFromY
  const sort = fields?.sort ?? null

  const { labels, datasets, colorByCategory } = getBarData(
    dataset,
    xField,
    yField,
    colorField,
    { filters, labelFields, sort }
  )

  if (!labels?.length || !datasets?.length) return emptyOption()

  const shouldUseCategoryPalette = !colorField && labels.length > 1 && datasets.length === 1
  const fallbackColors = shouldUseCategoryPalette ? buildCategoryPalette(labels.length) : null

  const series = datasets.map(ds => {
    const itemStyle = Array.isArray(ds.backgroundColor)
      ? { color: (params) => ds.backgroundColor[params.dataIndex] ?? ds.backgroundColor[0] }
      : shouldUseCategoryPalette
        ? { color: (params) => fallbackColors[params.dataIndex] ?? fallbackColors[0] }
        : { color: ds.backgroundColor }
    return {
    name: ds.label,
    type: 'bar',
    data: ds.data,
    itemStyle,
    ...(showMeasureValuesLabels && { label: { show: true, position: 'top' } })
  }
  })

  const showLegend = !(colorByCategory && datasets.length === 1)
  const xAxis = { type: 'category', data: labels }
  const yAxis = { type: 'value', name: yField?.[0]?.label || 'Y' }
  return {
    tooltip: { trigger: 'axis', appendToBody: true },
    legend: buildLegend(showLegend, compact),
    grid: buildGrid(
      { left: 60, right: 40, bottom: showLegend ? 80 : 40, top: 20 },
      compact,
      { left: 36, right: 24, bottom: showLegend ? 56 : 32, top: 12 }
    ),
    xAxis: compact ? applyCompactCategoryAxis(applyCompactAxis(xAxis)) : xAxis,
    yAxis: compact ? applyCompactValueAxis(yAxis) : yAxis,
    series
  }
}

function formatPieLabelValue(value, percent, field) {
  const format = field?.format ?? 'number'
  const decimalPlaces = Math.max(0, Math.min(20, Number(field?.decimalPlaces) ?? 0))
  const digitGrouping = field?.digitGrouping ?? 'with_separator'
  const prefix = field?.prefix ?? ''
  const postfix = field?.postfix ?? ''
  let str
  if (format === 'percent') {
    const p = Number(percent)
    str = Number.isFinite(p) ? (digitGrouping === 'with_separator' ? p.toLocaleString('ru-RU', { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces }) : p.toFixed(decimalPlaces)) : ''
    str = str + '%'
  } else {
    const n = Number(value)
    if (!Number.isFinite(n)) {
      str = ''
    } else if (digitGrouping === 'with_separator') {
      str = n.toLocaleString('ru-RU', { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces })
    } else {
      str = decimalPlaces > 0 ? n.toFixed(decimalPlaces) : String(Math.round(n))
    }
  }
  return (prefix + str + postfix).trim() || str
}

function buildPieOption(fields, dataset, isDoughnut, filters, compact) {
  const categoryFields = findField(fields, ['category', 'categories', 'x', 'labels'], true)
  const valueFields = findField(fields, ['indicators', 'values', 'y'], true)
  const colorFields = findField(fields, ['color', 'colors'], true)
  const sortFields = fields?.sort ?? []
  const firstValueField = Array.isArray(valueFields) && valueFields.length ? valueFields[0] : null

  const { labels, datasets } = getPieData(
    dataset,
    categoryFields || [],
    valueFields || [],
    colorFields || [],
    sortFields,
    filters
  )

  if (!labels?.length || !datasets?.length) return emptyOption()

  const firstDataset = datasets[0]
  const pieData = labels.map((name, i) => ({
    name,
    value: firstDataset.data[i],
    itemStyle: Array.isArray(firstDataset.backgroundColor)
      ? { color: firstDataset.backgroundColor[i] }
      : { color: firstDataset.backgroundColor }
  }))

  const seriesEntry = {
    name: firstDataset.label,
    type: 'pie',
    radius: isDoughnut ? (compact ? ['35%', '72%'] : ['40%', '70%']) : (compact ? '68%' : '60%'),
    center: compact ? ['50%', '50%'] : ['50%', '45%'],
    data: pieData,
    emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.2)' } }
  }

  if (firstValueField && firstValueField.showCaption !== false) {
    const valueField = firstValueField
    seriesEntry.label = {
      show: true,
      formatter: (params) => {
        const name = params.name ?? ''
        const valueStr = formatPieLabelValue(params.value, params.percent, valueField)
        return valueStr ? `${name}\n${valueStr}` : name
      }
    }
  }

  return {
    tooltip: { trigger: 'item', appendToBody: true },
    legend: buildLegend(true, compact),
    series: [seriesEntry]
  }
}

function buildScatterOption(fields, dataset, filters, compact) {
  const scatterResult = getScatterData(
    dataset,
    findField(fields, ['x'], true),
    findField(fields, ['y'], true),
    findField(fields, ['points'], true),
    findField(fields, ['size'], true),
    findField(fields, ['color'], true),
    fields?.sort ?? [],
    filters
  )

  const { datasets, meta } = scatterResult
  if (!datasets?.length) return emptyOption()

  const series = datasets.map((ds, idx) => ({
    name: ds.label,
    type: 'scatter',
    data: ds.data.map(p => [p.x, p.y, p.r]),
    symbolSize: (val) => (val[2] != null ? val[2] : 8),
    itemStyle: { color: Array.isArray(ds.backgroundColor) ? ds.backgroundColor[0] : ds.backgroundColor }
  }))

  const xAxis = { type: meta?.xLabels?.length ? 'category' : 'value', data: meta?.xLabels || null, name: findField(fields, ['x'])?.label || 'X' }
  const yAxis = { type: meta?.yLabels?.length ? 'category' : 'value', data: meta?.yLabels || null, name: findField(fields, ['y'])?.label || 'Y' }
  const compactXAxis = compact
    ? (xAxis.type === 'value'
      ? applyCompactValueAxis(xAxis)
      : applyCompactCategoryAxis(applyCompactAxis(xAxis)))
    : xAxis
  const compactYAxis = compact
    ? (yAxis.type === 'value'
      ? applyCompactValueAxis(yAxis)
      : applyCompactCategoryAxis(applyCompactAxis(yAxis)))
    : yAxis
  const option = {
    tooltip: { trigger: 'item', appendToBody: true },
    legend: buildLegend(true, compact),
    grid: buildGrid(
      { left: 60, right: 40, bottom: 80, top: 20 },
      compact,
      { left: 36, right: 24, bottom: 56, top: 12 }
    ),
    xAxis: compactXAxis,
    yAxis: compactYAxis,
    series
  }

  if (!meta?.xLabels?.length) delete option.xAxis.data
  if (!meta?.yLabels?.length) delete option.yAxis.data
  return option
}

function buildRadarOption(fields, dataset, filters, compact) {
  const categoryField = findField(fields, ['category', 'labels', 'x'])
  const valueFields = findField(fields, ['indicators', 'y'], true)
  const colorField = findField(fields, ['color', 'colors'])
  const sortFields = fields?.sort ?? []

  const { labels, datasets } = getRadarData(
    dataset,
    categoryField,
    valueFields || [],
    colorField,
    filters,
    sortFields
  )

  if (!labels?.length || !datasets?.length) return emptyOption()

  const indicator = labels.map(name => ({ name, max: Math.max(...datasets.map(d => Math.max(...d.data))) || 1 }))

  const series = datasets.map(ds => ({
    name: ds.label,
    type: 'radar',
    lineStyle: { color: ds.borderColor },
    areaStyle: { color: ds.backgroundColor },
    data: [{ value: ds.data, name: ds.label }]
  }))

  return {
    tooltip: { trigger: 'item', appendToBody: true },
    legend: buildLegend(true, compact),
    radar: { indicator, center: ['50%', '50%'], radius: compact ? '70%' : '65%' },
    series
  }
}

function buildAreaOption(fields, settings, dataset, filters, compact) {
  const lineOpt = buildLineOption(fields, settings, dataset, filters, compact)
  if (lineOpt.series?.length) {
    lineOpt.series.forEach(s => {
      s.areaStyle = { opacity: 0.35 }
    })
  }
  return lineOpt
}

function buildBarHorizontalOption(fields, settings, dataset, filters, compact) {
  const xField = findField(fields, ['x'], true)
  const yField = findField(fields, ['y'], true)
  const colorField = findField(fields, ['color', 'colors'])
  const labelFieldsRaw = findField(fields, ['labels', 'label'], true)
  const labelFields = labelFieldsRaw?.filter(f => !isMeasureValuesField(f)) ?? []
  const showLabelsFromY = (yField || []).some((f) => f.showCaption !== false)
  const showMeasureValuesLabels = labelFieldsRaw?.some(isMeasureValuesField) || showLabelsFromY
  const sort = fields?.sort ?? null

  const { labels, datasets, colorByCategory } = getBarData(
    dataset,
    xField,
    yField,
    colorField,
    { filters, labelFields, sort }
  )

  if (!labels?.length || !datasets?.length) return emptyOption()

  const series = datasets.map(ds => ({
    name: ds.label,
    type: 'bar',
    data: ds.data || [],
    itemStyle: Array.isArray(ds.backgroundColor)
      ? (params) => ({ color: ds.backgroundColor[params.dataIndex] ?? ds.backgroundColor[0] })
      : { color: ds.backgroundColor },
    ...(showMeasureValuesLabels && { label: { show: true, position: 'right' } })
  }))

  const showLegend = !(colorByCategory && datasets.length === 1)
  const xAxis = { type: 'value', name: yField?.[0]?.label || 'Y' }
  const yAxis = { type: 'category', data: labels }
  return {
    tooltip: { trigger: 'axis' },
    legend: buildLegend(showLegend, compact),
    grid: buildGrid(
      { left: 60, right: 40, bottom: showLegend ? 80 : 40, top: 20 },
      compact,
      { left: 36, right: 24, bottom: showLegend ? 56 : 32, top: 12 }
    ),
    xAxis: compact ? applyCompactValueAxis(xAxis) : xAxis,
    yAxis: compact ? applyCompactCategoryAxis(applyCompactAxis(yAxis)) : yAxis,
    series
  }
}

function buildCombinedOption(fields, settings, dataset, filters, compact) {
  const xFields = findField(fields, ['x'], true)
  const yFields = findField(fields, ['y'], true)
  const y2Fields = findField(fields, ['y2'], true)
  const colorField = findField(fields, ['color', 'colors'])
  const sortFields = fields?.sort ?? []
  const labelField = findField(fields, ['labels', 'label'])
  const labelFieldForX = isMeasureValuesField(labelField) ? null : labelField

  const { labels, datasets: lineDatasets } = getLineData(
    dataset,
    xFields || [],
    [],
    y2Fields || [],
    colorField,
    sortFields,
    labelFieldForX,
    filters
  )

  const xField = findField(fields, ['x'], true)
  const yField = findField(fields, ['y'], true)
  const labelFieldsRaw = findField(fields, ['labels', 'label'], true)
  const labelFields = labelFieldsRaw?.filter(f => !isMeasureValuesField(f)) ?? []
  const showLabelsFromY = (yField || []).some((f) => f.showCaption !== false) || (y2Fields || []).some((f) => f.showCaption !== false)
  const showMeasureValuesLabels = labelFieldsRaw?.some(isMeasureValuesField) || showLabelsFromY
  const sort = fields?.sort ?? null
  const { labels: barLabels, datasets: barDatasets } = getBarData(
    dataset,
    xField,
    yField,
    colorField,
    { filters, labelFields, sort }
  )

  const useLabels = barLabels?.length ? barLabels : labels
  if (!useLabels?.length) return emptyOption()

  const series = []
  barDatasets.forEach(ds => {
    series.push({
      name: ds.label,
      type: 'bar',
      data: ds.data,
      itemStyle: Array.isArray(ds.backgroundColor)
        ? (params) => ({ color: ds.backgroundColor[params.dataIndex] ?? ds.backgroundColor[0] })
        : { color: ds.backgroundColor },
      yAxisIndex: 0,
      ...(showMeasureValuesLabels && { label: { show: true, position: 'top' } })
    })
  })

  const hasY2 = lineDatasets?.some(d => d.yAxisID === 'y2') && lineDatasets?.length
  if (hasY2 && lineDatasets.length) {
    lineDatasets.forEach(ds => {
      series.push({
        name: ds.label,
        type: 'line',
        data: ds.data,
        smooth: true,
        lineStyle: { color: ds.borderColor },
        itemStyle: { color: ds.borderColor },
        yAxisIndex: 1,
        ...(showMeasureValuesLabels && { label: { show: true, position: 'top' } })
      })
    })
  }

  const yAxisList = [
    { type: 'value', name: yField?.[0]?.label || 'Y', position: 'left' }
  ]
  if (hasY2) {
    yAxisList.push({
      type: 'value',
      name: y2Fields?.[0]?.label || 'Y2',
      position: 'right',
      splitLine: { show: false }
    })
  }

  return {
    tooltip: { trigger: 'axis', appendToBody: true },
    legend: buildLegend(true, compact),
    grid: buildGrid(
      { left: 60, right: hasY2 ? 60 : 40, bottom: 80, top: 20 },
      compact,
      { left: 36, right: hasY2 ? 36 : 24, bottom: 56, top: 12 }
    ),
    xAxis: { type: 'category', data: useLabels, boundaryGap: true },
    yAxis: yAxisList.length === 1 ? yAxisList[0] : yAxisList,
    series
  }
}

function buildFunnelOption(fields, dataset, filters) {
  const categoryField = findField(fields, ['category', 'categories', 'x'])
  const valueField = findField(fields, ['value', 'indicators', 'y'])
  if (!categoryField || !valueField) return emptyOption()
  const valueArr = Array.isArray(valueField) ? valueField : [valueField]
  const vf = valueArr[0]
  const data = getFunnelData(dataset, categoryField, vf, filters)
  if (!data.length) return emptyOption()
  return {
    tooltip: { trigger: 'item', appendToBody: true },
    series: [{ type: 'funnel', data, sort: 'descending', gap: 2, label: { show: true } }]
  }
}

function buildGaugeOption(fields, dataset, filters) {
  const valueField = findField(fields, ['value', 'indicators', 'y'])
  const targetField = findField(fields, ['target'])
  if (!valueField) return emptyOption()
  const vf = Array.isArray(valueField) ? valueField[0] : valueField
  const { value, target } = getGaugeData(dataset, vf, targetField, filters)
  const max = Math.max(value, target ?? 0, 100) * 1.2
  return {
    tooltip: { trigger: 'item', appendToBody: true },
    series: [{
      type: 'gauge',
      min: 0,
      max: Math.ceil(max) || 100,
      progress: { show: true },
      detail: { formatter: '{value}', fontSize: 16, offsetCenter: [0, '70%'] },
      data: [{ value, name: vf?.label || 'Значение' }]
    }]
  }
}

function buildTreemapOption(fields, dataset, filters) {
  const categoryField = findField(fields, ['category', 'categories', 'x'])
  const valueField = findField(fields, ['value', 'indicators', 'y'])
  if (!categoryField || !valueField) return emptyOption()
  const vf = Array.isArray(valueField) ? valueField[0] : valueField
  const data = getTreemapData(dataset, categoryField, vf, filters)
  if (!data.length) return emptyOption()
  return {
    tooltip: { trigger: 'item', appendToBody: true },
    series: [{ type: 'treemap', data, roam: false, leafDepth: 1, levels: [{ itemStyle: { borderWidth: 1 } }] }]
  }
}

function buildHeatmapOption(fields, dataset, compact) {
  const xField = findField(fields, ['x'])
  const yField = findField(fields, ['y'])
  const valueField = findField(fields, ['value', 'y2', 'indicator'])
  const colorField = findField(fields, ['color', 'colors'])

  const result = getHeatmapData(dataset, xField, yField, valueField, colorField)
  const { labels: xLabels, datasets } = result
  if (!xLabels?.length || !datasets?.length) return emptyOption()

  const yLabels = datasets.map(d => d.label)
  const data = []
  for (let yi = 0; yi < yLabels.length; yi++) {
    for (let xi = 0; xi < xLabels.length; xi++) {
      const v = datasets[yi].data[xi]
      if (v != null && Number.isFinite(Number(v))) data.push([xi, yi, Number(v)])
    }
  }

  const values = data.map(d => d[2])
  const min = Math.min(...values)
  const max = Math.max(...values)

  return {
    tooltip: { position: 'top', appendToBody: true },
    grid: buildGrid(
      { left: 80, right: 40, bottom: 60, top: 20 },
      compact,
      { left: 60, right: 24, bottom: 48, top: 12 }
    ),
    xAxis: { type: 'category', data: xLabels, splitArea: { show: true } },
    yAxis: { type: 'category', data: yLabels, splitArea: { show: true } },
    visualMap: {
      min,
      max,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: compact ? 4 : 10,
      inRange: { color: ['#e0f3f8', '#abd9e9', '#74add1', '#4575b4', '#313695'] }
    },
    series: [{ type: 'heatmap', data, label: { show: false }, emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } } }]
  }
}
