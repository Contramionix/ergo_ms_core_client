import {
  TrendingUp,
  BarChart3,
  ChartPie,
  CircleDot,
  ChartScatter,
  Radar,
  LayoutGrid,
  AreaChart,
  BarChartHorizontal,
  LineChart,
  Filter,
  Gauge,
  Hash,
  Table
} from 'lucide-vue-next'

const CHART_TYPE_ICON_MAP = {
  line: TrendingUp,
  bar: BarChart3,
  pie: ChartPie,
  doughnut: CircleDot,
  scatter: ChartScatter,
  radar: Radar,
  heatmap: LayoutGrid,
  area: AreaChart,
  barHorizontal: BarChartHorizontal,
  combined: LineChart,
  funnel: Filter,
  gauge: Gauge,
  treemap: LayoutGrid,
  indicator: Hash,
  table: Table
}

const CHART_TYPE_COLORS = {
  line: '#0d6efd',
  bar: '#dc3545',
  pie: '#198754',
  doughnut: '#fd7e14',
  scatter: '#6f42c1',
  radar: '#0dcaf0',
  heatmap: '#d63384',
  area: '#0d6efd',
  barHorizontal: '#dc3545',
  combined: '#6c757d',
  funnel: '#20c997',
  gauge: '#fd7e14',
  treemap: '#6610f2',
  indicator: '#0dcaf0',
  table: '#198754'
}

export const CHART_TYPE_OPTIONS = [
  { value: 'line', label: 'Линейная диаграмма' },
  { value: 'bar', label: 'Столбчатая диаграмма' },
  { value: 'pie', label: 'Круговая диаграмма' },
  { value: 'doughnut', label: 'Кольцевая диаграмма' },
  { value: 'scatter', label: 'Точечная диаграмма' },
  { value: 'radar', label: 'Радарная диаграмма' },
  { value: 'heatmap', label: 'Тепловая карта' },
  { value: 'area', label: 'Диаграмма с областями' },
  { value: 'barHorizontal', label: 'Линейчатая диаграмма' },
  { value: 'combined', label: 'Комбинированная диаграмма' },
  { value: 'funnel', label: 'Воронка' },
  { value: 'gauge', label: 'Спидометр' },
  { value: 'treemap', label: 'Древовидная диаграмма' },
  { value: 'indicator', label: 'Индикатор' },
  { value: 'table', label: 'Таблица' }
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
