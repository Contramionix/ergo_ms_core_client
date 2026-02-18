import { Type, Hash, Calendar, CheckCircle, MapPin, Globe, SquareFunction } from 'lucide-vue-next'

export const typeIcon = {
  string: Type,
  integer: Hash,
  float: Hash,
  number: Hash,
  date: Calendar,
  'date&time': Calendar,
  datetime: Calendar,
  bool: CheckCircle,
  boolean: CheckCircle,
  geopoint: MapPin,
  geopolygon: Globe,
  expression: SquareFunction
}

const typeLabel = {
  expression: 'fx'
}

export const INDICATOR_COLOR = '#dc3545'
export const MEASURE_COLOR = '#198754'
export const PARAMETER_ICON_COLOR = '#6f42c1'

export function getFieldCategoryColor(field) {
  const aggregation = field?.aggregation
  if (!aggregation || aggregation === 'none') {
    return INDICATOR_COLOR
  }
  return MEASURE_COLOR
}

export function getItemDisplayColor(item) {
  if (item?.param) return PARAMETER_ICON_COLOR
  return getFieldCategoryColor(item)
}

export function getTypeDisplayMeta(type) {
  const icon = typeIcon[type] || Type
  const label = typeLabel[type] ?? ''
  return { icon, label }
}

export function isFieldMeasure(field) {
  const aggregation = field?.aggregation
  return aggregation && aggregation !== 'none'
}

export function isFieldIndicator(field) {
  const aggregation = field?.aggregation
  return !aggregation || aggregation === 'none'
}
