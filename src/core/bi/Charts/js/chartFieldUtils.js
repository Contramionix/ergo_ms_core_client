import { isVirtualMeasureField } from './measureVirtualFields.js'
import { expandDateRangeFilter } from '../components/js/chartDateFilterUtils.js'

export function filterParamsForApi(params) {
  if (!params || typeof params !== 'object') return params ?? {}
  const filtered = {}
  for (const [key, arr] of Object.entries(params)) {
    if (!Array.isArray(arr)) {
      filtered[key] = arr
      continue
    }
    let cleaned = arr.filter((f) => !isVirtualMeasureField(f))

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

export function buildFieldsForChart(params, sortDesc) {
  const filtered = filterParamsForApi(params ?? {})
  const sortArr = Array.isArray(filtered.sort) ? filtered.sort : []
  const sortMapped = sortArr.map((f) => ({ field: f.name, desc: !!sortDesc }))
  return {
    ...filtered,
    sort: sortMapped,
  }
}
