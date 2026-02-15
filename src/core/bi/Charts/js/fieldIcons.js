import { Type, Hash, Calendar, CheckCircle, MapPin, Globe, BarChart2 } from 'lucide-vue-next'
import { isVirtualMeasureField } from './measureVirtualFields.js'

export const FIELD_TYPE_ICONS = {
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

export function getFieldIcon(f, virtualIcon = BarChart2) {
  if (isVirtualMeasureField(f)) return virtualIcon
  return FIELD_TYPE_ICONS[f?.type] || Type
}

export function getFieldDisplayName(f) {
  if (isVirtualMeasureField(f)) return f.displayName ?? f.label ?? f.name
  return f.displayName ?? f.name
}
