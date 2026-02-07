import {
  TrendingUp,
  BarChart3,
  ChartPie,
  CircleDot,
  ChartScatter,
  Radar,
  LayoutGrid
} from 'lucide-vue-next'

const CHART_TYPE_ICON_MAP = {
  line: TrendingUp,
  bar: BarChart3,
  pie: ChartPie,
  doughnut: CircleDot,
  scatter: ChartScatter,
  radar: Radar,
  heatmap: LayoutGrid
}

const CHART_TYPE_COLORS = {
  line: '#0d6efd',
  bar: '#dc3545',
  pie: '#198754',
  doughnut: '#fd7e14',
  scatter: '#6f42c1',
  radar: '#0dcaf0',
  heatmap: '#d63384'
}

export const CHART_TYPE_OPTIONS = [
  { value: 'line', label: 'Линейная диаграмма' },
  { value: 'bar', label: 'Столбчатая диаграмма' },
  { value: 'pie', label: 'Круговая диаграмма' },
  { value: 'doughnut', label: 'Кольцевая диаграмма' },
  { value: 'scatter', label: 'Точечная диаграмма' },
  { value: 'radar', label: 'Радарная диаграмма' },
  { value: 'heatmap', label: 'Тепловая карта' }
]

export function getChartTypeIcon(chartType) {
  if (!chartType || typeof chartType !== 'string') return ChartPie
  const normalized = chartType.toLowerCase().trim()
  return CHART_TYPE_ICON_MAP[normalized] ?? ChartPie
}

export function getChartTypeLabel(chartType) {
  if (!chartType || typeof chartType !== 'string') return 'Чарт'
  const normalized = chartType.toLowerCase().trim()
  const opt = CHART_TYPE_OPTIONS.find(o => o.value === normalized)
  return opt ? opt.label : 'Чарт'
}

export function getChartTypeColor(chartType) {
  if (!chartType || typeof chartType !== 'string') return undefined
  const normalized = chartType.toLowerCase().trim()
  return CHART_TYPE_COLORS[normalized]
}
