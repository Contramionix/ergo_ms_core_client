import { Type, Hash, Calendar, CheckCircle, MapPin, Globe } from 'lucide-vue-next'

export const typeIcon = {
  string: Type,
  integer: Hash,
  float: Hash,
  number: Hash,
  date: Calendar,
  'date&time': Calendar,
  bool: CheckCircle,
  boolean: CheckCircle,
  geopoint: MapPin,
  geopolygon: Globe,
}

export const PARAMETER_ICON_COLOR = '#6f42c1'

export function getFieldCategoryColor(field) {
  const aggregation = field?.aggregation
  
  if (!aggregation || aggregation === 'none') {
    return '#dc3545'
  }
  return '#198754'
}

export function isFieldMeasure(field) {
  const aggregation = field?.aggregation
  return aggregation && aggregation !== 'none'
}

export function isFieldIndicator(field) {
  const aggregation = field?.aggregation
  return !aggregation || aggregation === 'none'
}
