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

function findField(fields, keys, many = false) {
  if (!fields) return many ? [] : null
  for (const k of keys) {
    if (fields[k] && fields[k].length)
      return many ? fields[k] : fields[k][0]
  }
  return many ? [] : null
}

function normalizedFilters(fields) {
  const raw = fields?.filters ?? []
  return raw.map((f) => ({
    field: { name: f.name },
    op: f.filter?.op ?? 'eq',
    value: f.filter?.value ?? []
  }))
}

/**
 * Строит опцию ECharts из type, fields, settings, dataset.
 * @param {{ type: string, fields: Object, settings: Array, dataset: Array }} params
 * @returns {import('echarts').EChartsOption}
 */
export function buildEChartsOption({ type, fields = {}, settings = [], dataset = [] }) {
  const filters = normalizedFilters(fields)
  if (!dataset?.length && type !== 'heatmap') return emptyOption()

  switch (type) {
    case 'line':
      return buildLineOption(fields, settings, dataset, filters)
    case 'bar':
      return buildBarOption(fields, settings, dataset, filters)
    case 'pie':
      return buildPieOption(fields, dataset, false, filters)
    case 'doughnut':
      return buildPieOption(fields, dataset, true, filters)
    case 'scatter':
      return buildScatterOption(fields, dataset, filters)
    case 'radar':
      return buildRadarOption(fields, dataset, filters)
    case 'heatmap':
      return buildHeatmapOption(fields, dataset)
    case 'area':
      return buildAreaOption(fields, settings, dataset, filters)
    case 'barHorizontal':
      return buildBarHorizontalOption(fields, settings, dataset, filters)
    case 'combined':
      return buildCombinedOption(fields, settings, dataset, filters)
    case 'funnel':
      return buildFunnelOption(fields, dataset, filters)
    case 'gauge':
      return buildGaugeOption(fields, dataset, filters)
    case 'treemap':
      return buildTreemapOption(fields, dataset, filters)
    default:
      return emptyOption()
  }
}

function emptyOption() {
  return {
    title: { text: 'Нет данных', left: 'center', top: 'middle', textStyle: { fontSize: 14 } },
    xAxis: { type: 'category', data: [] },
    yAxis: { type: 'value' },
    series: []
  }
}

function buildLineOption(fields, settings, dataset, filters) {
  const xFields = findField(fields, ['x'], true)
  const yFields = findField(fields, ['y'], true)
  const y2Fields = findField(fields, ['y2'], true)
  const colorField = findField(fields, ['color', 'colors'])
  const sortFields = fields?.sort ?? []
  const labelField = findField(fields, ['labels', 'label'])

  const { labels, datasets } = getLineData(
    dataset,
    xFields || [],
    yFields || [],
    y2Fields || [],
    colorField,
    sortFields,
    labelField,
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

  const series = datasets.map((ds) => ({
    name: ds.label,
    type: 'line',
    data: ds.data,
    smooth: true,
    lineStyle: ds.borderDash?.length ? { type: 'dashed', color: ds.borderColor } : { color: ds.borderColor },
    itemStyle: { color: ds.borderColor },
    yAxisIndex: ds.yAxisID === 'y2' ? 1 : 0
  }))

  return {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, type: 'scroll' },
    grid: { left: 60, right: hasY2 ? 60 : 40, bottom: 80, top: 20, containLabel: true },
    xAxis: { type: 'category', data: labels, boundaryGap: false },
    yAxis: yAxisList.length === 1 ? yAxisList[0] : yAxisList,
    series
  }
}

function buildBarOption(fields, settings, dataset, filters) {
  const xField = findField(fields, ['x'], true)
  const yField = findField(fields, ['y'], true)
  const colorField = findField(fields, ['color', 'colors'])
  const labelFields = findField(fields, ['labels', 'label'], true)
  const sort = fields?.sort ?? null

  const { labels, datasets } = getBarData(
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
    data: ds.data,
    itemStyle: Array.isArray(ds.backgroundColor)
      ? (params) => ({ color: ds.backgroundColor[params.dataIndex] ?? ds.backgroundColor[0] })
      : { color: ds.backgroundColor }
  }))

  return {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, type: 'scroll' },
    grid: { left: 60, right: 40, bottom: 80, top: 20, containLabel: true },
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value', name: yField?.[0]?.label || 'Y' },
    series
  }
}

function buildPieOption(fields, dataset, isDoughnut, filters) {
  const categoryFields = findField(fields, ['category', 'categories', 'x', 'labels'], true)
  const valueFields = findField(fields, ['indicators', 'values', 'y'], true)
  const colorFields = findField(fields, ['color', 'colors'], true)
  const sortFields = fields?.sort ?? []

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

  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, type: 'scroll' },
    series: [{
      name: firstDataset.label,
      type: 'pie',
      radius: isDoughnut ? ['40%', '70%'] : '60%',
      center: ['50%', '45%'],
      data: pieData,
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.2)' } }
    }]
  }
}

function buildScatterOption(fields, dataset, filters) {
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

  const option = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, type: 'scroll' },
    grid: { left: 60, right: 40, bottom: 80, top: 20, containLabel: true },
    xAxis: { type: meta?.xLabels?.length ? 'category' : 'value', data: meta?.xLabels || null, name: findField(fields, ['x'])?.label || 'X' },
    yAxis: { type: meta?.yLabels?.length ? 'category' : 'value', data: meta?.yLabels || null, name: findField(fields, ['y'])?.label || 'Y' },
    series
  }

  if (!meta?.xLabels?.length) delete option.xAxis.data
  if (!meta?.yLabels?.length) delete option.yAxis.data
  return option
}

function buildRadarOption(fields, dataset, filters) {
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
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, type: 'scroll' },
    radar: { indicator, center: ['50%', '50%'], radius: '65%' },
    series
  }
}

function buildAreaOption(fields, settings, dataset, filters) {
  const lineOpt = buildLineOption(fields, settings, dataset, filters)
  if (lineOpt.series?.length) {
    lineOpt.series.forEach(s => {
      s.areaStyle = { opacity: 0.35 }
    })
  }
  return lineOpt
}

function buildBarHorizontalOption(fields, settings, dataset, filters) {
  const xField = findField(fields, ['x'], true)
  const yField = findField(fields, ['y'], true)
  const colorField = findField(fields, ['color', 'colors'])
  const labelFields = findField(fields, ['labels', 'label'], true)
  const sort = fields?.sort ?? null

  const { labels, datasets } = getBarData(
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
      : { color: ds.backgroundColor }
  }))

  return {
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, type: 'scroll' },
    grid: { left: 60, right: 40, bottom: 80, top: 20, containLabel: true },
    xAxis: { type: 'value', name: yField?.[0]?.label || 'Y' },
    yAxis: { type: 'category', data: labels },
    series
  }
}

function buildCombinedOption(fields, settings, dataset, filters) {
  const xFields = findField(fields, ['x'], true)
  const yFields = findField(fields, ['y'], true)
  const y2Fields = findField(fields, ['y2'], true)
  const colorField = findField(fields, ['color', 'colors'])
  const sortFields = fields?.sort ?? []
  const labelField = findField(fields, ['labels', 'label'])

  const { labels, datasets: lineDatasets } = getLineData(
    dataset,
    xFields || [],
    [],
    y2Fields || [],
    colorField,
    sortFields,
    labelField,
    filters
  )

  const xField = findField(fields, ['x'], true)
  const yField = findField(fields, ['y'], true)
  const labelFields = findField(fields, ['labels', 'label'], true)
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
      yAxisIndex: 0
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
        yAxisIndex: 1
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
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, type: 'scroll' },
    grid: { left: 60, right: hasY2 ? 60 : 40, bottom: 80, top: 20, containLabel: true },
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
    tooltip: { trigger: 'item' },
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
    tooltip: { trigger: 'item' },
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
    tooltip: { trigger: 'item' },
    series: [{ type: 'treemap', data, roam: false, leafDepth: 1, levels: [{ itemStyle: { borderWidth: 1 } }] }]
  }
}

function buildHeatmapOption(fields, dataset) {
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
    tooltip: { position: 'top' },
    grid: { left: 80, right: 40, bottom: 60, top: 20, containLabel: true },
    xAxis: { type: 'category', data: xLabels, splitArea: { show: true } },
    yAxis: { type: 'category', data: yLabels, splitArea: { show: true } },
    visualMap: {
      min,
      max,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 10,
      inRange: { color: ['#e0f3f8', '#abd9e9', '#74add1', '#4575b4', '#313695'] }
    },
    series: [{ type: 'heatmap', data, label: { show: false }, emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } } }]
  }
}
