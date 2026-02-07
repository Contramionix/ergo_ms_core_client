export class ChartDTO {
  constructor({ id, name, type_display, chart_type, created_at, owner }) {
    this.id = id
    this.name = name || '—'
    this.type_display = type_display || '—'
    this.chart_type = chart_type ?? null
    this.created_at = created_at
    this.owner = owner
    this.type = 'chart'
  }
} 